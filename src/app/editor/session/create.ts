import { createEditor } from '@openweave/core/editor'
import { BUILTIN_IO_FORMATS, IORegistry } from '@openweave/core/io'
import { SceneGraph } from '@openweave/scene-graph'

import {
  getActiveEditorStore,
  getActiveEditorStoreOrNull,
  setActiveEditorStore,
  useEditorStore
} from '@/app/editor/active-store'
import { resolveFigmaClipboardImages } from '@/app/editor/clipboard/figma-images'
import { bindClipboardNotifications } from '@/app/editor/clipboard/notifications'
import { loadFont } from '@/app/editor/fonts'
import {
  defineEditorDerivedAccessors,
  createEditorStoreModules,
  defineEditorStoreAccessors
} from '@/app/editor/session/modules'
import { createObservableState } from '@/app/editor/session/observable-state'
import { createInitialAppEditorState, type AppEditorState } from '@/app/editor/session/types'
import { IS_TAURI } from '@/constants'

export { EDITOR_TOOLS as TOOLS, TOOL_SHORTCUTS } from '@openweave/core/editor'
export type { EditorToolDef as ToolDef, Tool } from '@openweave/core/editor'

export function createEditorStore(initialGraph?: SceneGraph) {
  const graph = initialGraph ?? new SceneGraph()

  const observable = createObservableState<AppEditorState>(
    createInitialAppEditorState(graph.getPages()[0].id)
  )
  const state = observable.state
  const subscribeState = (l: Parameters<typeof observable.subscribe>[0]) => observable.subscribe(l)

  const viewportSize = { width: 0, height: 0 }
  const editor = createEditor({
    graph,
    state,
    loadFont,
    resolveFigmaClipboardImages: IS_TAURI ? resolveFigmaClipboardImages : undefined,
    skipInitialGraphSetup: !!initialGraph,
    getViewportSize: () =>
      viewportSize.width > 0 && viewportSize.height > 0
        ? viewportSize
        : typeof window !== 'undefined'
          ? { width: window.innerWidth, height: window.innerHeight }
          : { width: 800, height: 600 }
  })
  const io = new IORegistry(BUILTIN_IO_FORMATS)
  bindClipboardNotifications(editor)

  // Hydrate timeline state from the graph if this editor is active
  const isEditorActive = () => {
    try {
      const active = getActiveEditorStoreOrNull()
      return !active || active.graph === editor.graph
    } catch {
      return true
    }
  }

  import('@/app/motion/store')
    .then((m) => {
      if (isEditorActive()) {
        m.hydrateTimelineFromGraph(editor.graph)
      }
      editor.onEditorEvent('graph:replaced', (g) => {
        if (isEditorActive()) m.hydrateTimelineFromGraph(g)
      })
      editor.onEditorEvent('node:created', (node) => {
        if (node.motionTracks && isEditorActive()) {
          m.hydrateTimelineFromGraph(editor.graph)
        }
      })
      editor.onEditorEvent('node:updated', (_node, changes) => {
        if (
          changes &&
          typeof changes === 'object' &&
          'motionTracks' in changes &&
          isEditorActive()
        ) {
          m.hydrateTimelineFromGraph(editor.graph)
        }
      })
      editor.onEditorEvent('node:deleted', () => {
        if (isEditorActive()) {
          m.hydrateTimelineFromGraph(editor.graph)
        }
      })
    })
    .catch(() => {})

  if (initialGraph) {
    editor.subscribeToGraph()
  }

  const modules = createEditorStoreModules(editor, state, io, viewportSize)

  // ─── Public API ───────────────────────────────────────────────
  // Spread all core Editor methods, then override getters and add app-specific.

  const store = {
    ...editor,
    state,
    subscribeState,

    // App-specific overrides and additions
    ...modules
  }

  defineEditorStoreAccessors(store, editor)
  defineEditorDerivedAccessors(store, editor)

  return store as typeof store & {
    readonly selectedNodes: ReturnType<typeof editor.getSelectedNodes>
    readonly selectedNode: ReturnType<typeof editor.getSelectedNodes>[number] | undefined
    readonly layerTree: ReturnType<typeof editor.getLayerTree>
  }
}

export type EditorStore = ReturnType<typeof createEditorStore>

export { getActiveEditorStore, setActiveEditorStore, useEditorStore }
