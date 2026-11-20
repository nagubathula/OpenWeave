import type { FigmaAPI } from '@openweave/core/figma-api'
import { computeAllLayouts } from '@openweave/core/layout'
import type { Rect, Vector } from '@openweave/scene-graph/primitives'

import { makeFigmaFromStore } from '@/app/automation/bridge/figma-factory'
import { getActiveEditorStore, type EditorStore } from '@/app/editor/active-store'
import { ensureGraphFonts } from '@/app/editor/fonts'
import { PluginSandbox, type SandboxLogLevel } from '@/app/plugins/sandbox'
import { PluginClientStorage, type InstalledPlugin } from '@/app/plugins/storage'
import { lastPluginRun, runningPlugin, type PluginUIState } from '@/app/plugins/store'
import { toast } from '@/app/shell/ui'

/**
 * Runs one Figma-style plugin at a time against the active tab. Plugin code
 * runs in the QuickJS sandbox with `figma` (the Figma-compatible API plus the
 * plugin-only members below); its UI runs in a sandboxed iframe rendered by
 * the plugin window, and the two talk through `figma.ui.postMessage` and
 * `parent.postMessage({ pluginMessage }, '*')`, as in Figma.
 */

type Listener = (...args: unknown[]) => unknown
type PluginEvent = 'selectionchange' | 'currentpagechange' | 'close' | 'run'
type PageSnapshot = ReturnType<EditorStore['snapshotPage']>

interface ShowUIOptions {
  width?: number
  height?: number
  visible?: boolean
  title?: string
}

const DEFAULT_UI_WIDTH = 300
const DEFAULT_UI_HEIGHT = 200
const GRAPH_EVENTS = [
  'node:created',
  'node:updated',
  'node:deleted',
  'node:reparented',
  'node:reordered'
] as const

let nextRunId = 1
let current: PluginSession | null = null

function sameIds(a: string[], b: Iterable<string>): boolean {
  const set = new Set(b)
  return a.length === set.size && a.every((id) => set.has(id))
}

/** `figma.ui`: a class instance, so the sandbox sees it as a live handle. */
class PluginUI {
  onmessage: Listener | null = null

  constructor(private readonly session: PluginSession) {}

  postMessage(message: unknown): void {
    this.session.postToUI(message)
  }

  on(type: string, listener: Listener): void {
    if (type === 'message') this.session.uiListeners.add(listener)
  }

  off(type: string, listener: Listener): void {
    if (type === 'message') this.session.uiListeners.delete(listener)
  }

  once(type: string, listener: Listener): void {
    if (type !== 'message') return
    const wrapped: Listener = (...args) => {
      this.session.uiListeners.delete(wrapped)
      return listener(...args)
    }
    this.session.uiListeners.add(wrapped)
  }

  show(): void {
    this.session.updateUI({ visible: true })
  }

  hide(): void {
    this.session.updateUI({ visible: false })
  }

  resize(width: number, height: number): void {
    this.session.updateUI({ width: Number(width), height: Number(height) })
  }

  reposition(): void {
    // The plugin window is positioned by the user.
  }

  close(): void {
    this.session.updateUI(null)
  }
}

/** Visible canvas size, approximated by the window (the canvas fills most of it). */
function viewportSize(): { width: number; height: number } {
  if (typeof window === 'undefined') return { width: 800, height: 600 }
  return { width: window.innerWidth, height: window.innerHeight }
}

/**
 * `figma.viewport`, live against the editor: reading `center`/`zoom` reflects
 * the canvas, and setting them or calling `scrollAndZoomIntoView` moves it.
 */
class PluginViewport {
  constructor(private readonly store: EditorStore) {}

  get zoom(): number {
    return this.store.state.zoom
  }

  set zoom(level: number) {
    if (Number.isFinite(level) && level > 0) this.store.zoomToLevel(level)
  }

  get center(): Vector {
    const { panX, panY, zoom } = this.store.state
    const { width, height } = viewportSize()
    return { x: (-panX + width / 2) / zoom, y: (-panY + height / 2) / zoom }
  }

  set center(point: Vector) {
    const { state } = this.store
    const { width, height } = viewportSize()
    state.panX = width / 2 - point.x * state.zoom
    state.panY = height / 2 - point.y * state.zoom
    this.store.requestRepaint()
  }

  get bounds(): Rect {
    const { width, height } = viewportSize()
    const { zoom } = this.store.state
    const center = this.center
    return {
      x: center.x - width / zoom / 2,
      y: center.y - height / zoom / 2,
      width: width / zoom,
      height: height / zoom
    }
  }

  scrollAndZoomIntoView(nodes: ReadonlyArray<{ absoluteBoundingBox: Rect | null }>): void {
    const boxes = Array.from(nodes, (node) => node.absoluteBoundingBox).filter(
      (box): box is Rect => box !== null
    )
    if (boxes.length === 0) return
    this.store.zoomToBounds(
      Math.min(...boxes.map((box) => box.x)),
      Math.min(...boxes.map((box) => box.y)),
      Math.max(...boxes.map((box) => box.x + box.width)),
      Math.max(...boxes.map((box) => box.y + box.height))
    )
  }
}

class PluginSession {
  readonly api: FigmaAPI
  readonly uiListeners = new Set<Listener>()
  private readonly ui = new PluginUI(this)
  private readonly listeners = new Map<PluginEvent, Set<Listener>>()
  private readonly unbind: Array<() => void> = []
  private sandbox: PluginSandbox | null = null
  private uiPort: ((message: unknown) => void) | null = null
  private uiQueue: unknown[] = []
  private before: PageSnapshot | null = null
  private inEntry = false
  private dirty = false
  private flushing = false
  private closed = false

  constructor(
    readonly plugin: InstalledPlugin,
    readonly command: string,
    readonly runId: number,
    private readonly store: EditorStore
  ) {
    this.api = makeFigmaFromStore(store)
    Object.assign(this.api, {
      showUI: (html: string, options?: ShowUIOptions) => this.showUI(html, options),
      ui: this.ui,
      closePlugin: (message?: string) => this.close(message),
      notify: (message: string, options?: { error?: boolean }) => {
        if (options?.error) toast.error(String(message))
        else toast.info(String(message))
        return { cancel: () => undefined }
      },
      clientStorage: new PluginClientStorage(plugin.id),
      on: (type: PluginEvent, listener: Listener) => this.listenersFor(type).add(listener),
      off: (type: PluginEvent, listener: Listener) => this.listenersFor(type).delete(listener),
      once: (type: PluginEvent, listener: Listener) => {
        const wrapped: Listener = (...args) => {
          this.listenersFor(type).delete(wrapped)
          return listener(...args)
        }
        this.listenersFor(type).add(wrapped)
      },
      command,
      pluginId: plugin.id,
      editorType: 'figma',
      mode: 'default',
      apiVersion: plugin.manifest.api ?? '1.0.0'
    })
    // FigmaAPI's own viewport only records a value; replace it with a live one.
    const viewport = new PluginViewport(store)
    Object.defineProperty(this.api, 'viewport', {
      configurable: true,
      get: () => viewport,
      set: (value: { center?: Vector; zoom?: number }) => {
        if (value.zoom !== undefined) viewport.zoom = value.zoom
        if (value.center) viewport.center = value.center
      }
    })
  }

  async start(): Promise<void> {
    const ui = this.plugin.ui
    const sandbox = await PluginSandbox.create({
      figma: this.api,
      mixed: this.api.mixed,
      globals: {
        __html__: typeof ui === 'string' ? ui : '',
        __uiFilesJson__: JSON.stringify(ui && typeof ui === 'object' ? ui : {})
      },
      onLog: (level, message) => this.log(level, message),
      onError: (error) => this.reportError(error),
      onEntryStart: () => this.beginEntry(),
      onEntryEnd: () => this.endEntry()
    })
    if (this.closed) {
      sandbox.dispose()
      return
    }
    this.sandbox = sandbox
    this.bindStore()
    sandbox.run(
      'globalThis.__uiFiles__ = JSON.parse(__uiFilesJson__); delete globalThis.__uiFilesJson__',
      'openweave-prelude.js'
    )
    sandbox.run(this.plugin.code, this.plugin.manifest.main)
    this.emit('run', { command: this.command, parameters: undefined })
  }

  // --- UI ---

  showUI(html: string, options: ShowUIOptions = {}): void {
    this.setUI({
      html: String(html),
      width: Number(options.width) || DEFAULT_UI_WIDTH,
      height: Number(options.height) || DEFAULT_UI_HEIGHT,
      visible: options.visible ?? true,
      title: options.title ?? this.plugin.name,
      allowedDomains: this.plugin.manifest.networkAccess?.allowedDomains
    })
  }

  updateUI(patch: Partial<PluginUIState> | null): void {
    const state = runningPlugin.get()
    if (!state || state.runId !== this.runId) return
    if (patch === null) {
      this.uiPort = null
      this.setUI(null)
      return
    }
    if (state.ui) this.setUI({ ...state.ui, ...patch })
  }

  private setUI(ui: PluginUIState | null) {
    const state = runningPlugin.get()
    if (!state || state.runId !== this.runId) return
    runningPlugin.set({ ...state, ui })
  }

  postToUI(message: unknown): void {
    if (this.uiPort) this.uiPort(message)
    else this.uiQueue.push(message)
  }

  connectUI(port: (message: unknown) => void): () => void {
    this.uiPort = port
    for (const message of this.uiQueue.splice(0)) port(message)
    return () => {
      if (this.uiPort === port) this.uiPort = null
    }
  }

  receiveFromUI(message: unknown): void {
    const props = { origin: 'null' }
    this.ui.onmessage?.(message, props)
    for (const listener of this.uiListeners) listener(message, props)
  }

  // --- Events ---

  private listenersFor(type: PluginEvent): Set<Listener> {
    let set = this.listeners.get(type)
    if (!set) {
      set = new Set()
      this.listeners.set(type, set)
    }
    return set
  }

  private emit(type: PluginEvent, ...args: unknown[]) {
    for (const listener of this.listenersFor(type)) listener(...args)
  }

  private bindStore() {
    const { store } = this
    this.unbind.push(
      store.onEditorEvent('selection:changed', () => {
        if (!this.flushing) this.emit('selectionchange')
      }),
      store.onEditorEvent('page:changed', () => {
        if (!this.flushing) this.emit('currentpagechange')
      }),
      ...GRAPH_EVENTS.map((event) =>
        store.onEditorEvent(event, () => {
          if (this.inEntry) this.dirty = true
        })
      )
    )
  }

  // --- Entry bookkeeping: keep `figma` and the editor in step ---

  private beginEntry() {
    const { api, store } = this
    const pageId = store.state.currentPageId
    if (api.currentPageId !== pageId) api.currentPage = api.wrapNode(pageId)
    const selected = [...store.state.selectedIds]
    if (
      !sameIds(
        api.currentPage.selection.map((node) => node.id),
        selected
      )
    ) {
      api.currentPage.selection = selected
        .map((id) => api.getNodeById(id))
        .filter((node) => node !== null)
    }
    this.before = store.snapshotPage()
    this.dirty = false
    this.inEntry = true
  }

  private endEntry() {
    this.inEntry = false
    const { api, store } = this
    this.flushing = true
    try {
      if (
        api.currentPageId !== store.state.currentPageId &&
        store.graph.getNode(api.currentPageId)
      ) {
        void store.switchPage(api.currentPageId)
      }
      const ids = api.currentPage.selection.map((node) => node.id)
      if (!sameIds(ids, store.state.selectedIds)) store.select(ids)
      if (this.dirty) this.commitChanges()
    } finally {
      this.flushing = false
    }
  }

  private commitChanges() {
    const { store } = this
    const pageId = store.state.currentPageId
    computeAllLayouts(store.graph, pageId)
    store.requestRender()
    const before = this.before
    if (before) {
      const after = store.snapshotPage()
      store.pushUndoEntry({
        label: `Plugin: ${this.plugin.name}`,
        forward: () => store.restorePageFromSnapshot(after),
        inverse: () => store.restorePageFromSnapshot(before)
      })
    }
    // Text added by the plugin may need fonts; lay out again once they load.
    const page = store.graph.getNode(pageId)
    if (page) {
      void ensureGraphFonts(store.graph, page.childIds, store.renderer).then(() => {
        computeAllLayouts(store.graph, pageId)
        store.requestRender()
      })
    }
  }

  // --- Lifecycle ---

  private log(level: SandboxLogLevel, message: string) {
    console[level](`[Plugin: ${this.plugin.name}]`, message)
  }

  private reportError(error: Error) {
    console.error(`[Plugin: ${this.plugin.name}]`, error)
    const reason =
      error.message === 'interrupted' ? 'stopped after running too long' : error.message
    toast.error(`${this.plugin.name}: ${reason}`)
  }

  close(message?: string): void {
    if (this.closed) return
    this.closed = true
    if (message) toast.info(String(message))
    try {
      this.emit('close')
    } catch (error) {
      console.warn(`[Plugin: ${this.plugin.name}] close handler failed`, error)
    }
    for (const unbind of this.unbind.splice(0)) unbind()
    this.uiPort = null
    this.sandbox?.dispose()
    if (current === this) current = null
    if (runningPlugin.get()?.runId === this.runId) runningPlugin.set(null)
  }
}

/** Runs `plugin` (a menu `command` when it has one), closing any running plugin first. */
export async function runPlugin(plugin: InstalledPlugin, command = ''): Promise<void> {
  closeRunningPlugin()
  const session = new PluginSession(plugin, command, nextRunId++, getActiveEditorStore())
  current = session
  runningPlugin.set({ runId: session.runId, pluginId: plugin.id, name: plugin.name, ui: null })
  lastPluginRun.set({ pluginId: plugin.id, command })
  try {
    await session.start()
  } catch (error) {
    session.close()
    toast.error(
      `${plugin.name} could not start: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}

export function closeRunningPlugin(): void {
  current?.close()
}

/** Connects the plugin window's iframe; returns a disconnect function. */
export function connectPluginUI(runId: number, port: (message: unknown) => void): () => void {
  if (!current || current.runId !== runId) return () => undefined
  return current.connectUI(port)
}

/** Delivers a `pluginMessage` from the plugin's UI iframe to its code. */
export function sendFromPluginUI(runId: number, message: unknown): void {
  if (current?.runId === runId) current.receiveFromUI(message)
}
