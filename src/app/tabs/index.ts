import { atom, computed } from 'nanostores'

import { BUILTIN_IO_FORMATS, IORegistry } from '@openweave/core/io'
import { readFigFile } from '@openweave/core/io/formats/fig'
import { computeAllLayouts } from '@openweave/core/layout'
import type { SceneGraph } from '@openweave/scene-graph'

import { propertiesActiveTab } from '@/app/ai/chat/use'
import { setOpenWeaveStore } from '@/app/browser-bridge'
import type { DocumentSourceIdentity } from '@/app/document/io/types'
import { setActiveEditorStore } from '@/app/editor/active-store'
import { createEditorStore } from '@/app/editor/session'
import type { EditorStore } from '@/app/editor/session'
import { addRecentFile } from '@/app/home/recent-files'
import { closeHome, openHome } from '@/app/home/store'
import { HOME_TEMPLATES, type HomeTemplate } from '@/app/home/templates'
import {
  activeStorageProviderID,
  createActiveStorageAdapter,
  type StorageDocument
} from '@/app/integrations/storage'
import { getLocalCanvasStore } from '@/app/storage/local-store'
import { seedStorageCanvasFromRemote } from '@/app/storage/sync/persist'
import { createFileOpenCoordinator } from '@/app/tabs/open/coordinator'
import { findTabByFileIdentity } from '@/app/tabs/open/identity'

export interface Tab {
  id: string
  store: EditorStore
}

const io = new IORegistry(BUILTIN_IO_FORMATS)
const fileOpenCoordinator = createFileOpenCoordinator()

let nextTabId = 1

function generateTabId(): string {
  return `tab-${nextTabId++}`
}

const tabsAtom = atom<Tab[]>([])
export const activeTabId = atom('')

/** Bumped when any open tab's document name changes so tab strips re-render. */
const tabNamesRevision = atom(0)
const tabStateUnsubscribers = new Map<string, () => void>()

export const activeTab = computed([tabsAtom, activeTabId], (tabs, id) =>
  tabs.find((t) => t.id === id)
)

export const allTabs = computed([tabsAtom, activeTabId, tabNamesRevision], (tabs, id) =>
  tabs.map((t) => ({
    id: t.id,
    name: t.store.state.documentName,
    isActive: t.id === id
  }))
)

export function getActiveStore(): EditorStore {
  const tab = tabsAtom.get().find((t) => t.id === activeTabId.get())
  if (!tab) throw new Error('No active tab')
  return tab.store
}

export function getActiveTabId(): string {
  return activeTabId.get()
}

export function getTabById(tabId: string): Tab | undefined {
  return tabsAtom.get().find((tab) => tab.id === tabId)
}

export function getTabForStore(store: EditorStore): Tab | undefined {
  return tabsAtom.get().find((tab) => tab.store === store)
}

export function getTabsSnapshot(): Tab[] {
  return [...tabsAtom.get()]
}

export function createTab(store?: EditorStore, initialGraph?: SceneGraph): Tab {
  const s = store ?? createEditorStore(initialGraph)
  const tab: Tab = { id: generateTabId(), store: s }
  tabStateUnsubscribers.set(
    tab.id,
    s.subscribeState((key) => {
      if (key === 'documentName') tabNamesRevision.set(tabNamesRevision.get() + 1)
    })
  )
  tabsAtom.set([...tabsAtom.get(), tab])
  activateTab(tab)
  return tab
}

function activateTab(tab: Tab) {
  activeTabId.set(tab.id)
  setActiveEditorStore(tab.store)
  setOpenWeaveStore(tab.store)
}

export function switchTab(tabId: string) {
  const tab = tabsAtom.get().find((t) => t.id === tabId)
  if (!tab) return
  activateTab(tab)
}

export function closeTab(tabId: string) {
  const tabs = tabsAtom.get()
  const idx = tabs.findIndex((t) => t.id === tabId)
  if (idx === -1) return

  const closingTab = tabs[idx]
  const wasActive = activeTabId.get() === tabId
  tabStateUnsubscribers.get(tabId)?.()
  tabStateUnsubscribers.delete(tabId)
  const remaining = tabs.filter((t) => t.id !== tabId)
  tabsAtom.set(remaining)

  if (remaining.length === 0) {
    createTab()
    closingTab.store.dispose()
    openHome()
    return
  }

  if (wasActive) {
    const newIdx = Math.min(idx, remaining.length - 1)
    activateTab(remaining[newIdx])
  }

  closingTab.store.dispose()
}

function yieldToUI(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof requestAnimationFrame !== 'undefined') {
      requestAnimationFrame(() => resolve())
    } else {
      setTimeout(resolve, 0)
    }
  })
}

function isDOMImportFile(file: File): boolean {
  return /\.(html?|xhtml)$/i.test(file.name)
}

function reusableTabStore(): EditorStore {
  const current = activeTab.get()
  const isUntouched =
    current?.store.state.documentName === 'Untitled' && !current.store.undo.canUndo
  return isUntouched ? current.store : createTab().store
}

function findStorageTab(providerId: string, documentId: string): Tab | undefined {
  return tabsAtom.get().find((tab) => {
    const binding = tab.store.getStorageBinding()
    return binding?.providerId === providerId && binding.documentId === documentId
  })
}

export async function openStorageDocumentInNewTab(document: StorageDocument): Promise<void> {
  const providerId = activeStorageProviderID.get()
  const existing = findStorageTab(providerId, document.id)
  if (existing) {
    switchTab(existing.id)
    closeHome()
    return
  }

  const store = reusableTabStore()
  store.state.documentName = document.name
  store.state.loading = true
  try {
    const local = getLocalCanvasStore()
    const localMetadata = await local.getMeta(document.id)
    const localBytes = localMetadata?.hasFig ? await local.readFig(document.id) : null
    const localIsAuthoritative =
      localMetadata?.syncStatus !== 'synced' ||
      !document.metadataAuthoritative ||
      localMetadata.updatedAt >= document.updatedAt
    let bytes = localBytes && localIsAuthoritative ? localBytes : null

    if (!bytes) {
      bytes = await createActiveStorageAdapter(providerId).getDocument(document.id)
      await seedStorageCanvasFromRemote({
        providerId,
        canvasId: document.id,
        name: document.name,
        updatedAt: document.updatedAt,
        figBytes: bytes
      })
    }

    const fileBytes = new Uint8Array(bytes.byteLength)
    fileBytes.set(bytes)
    const file = new File([fileBytes.buffer], `${document.name}.fig`, {
      type: 'application/octet-stream'
    })
    const imported = await readFigFile(file, { populate: 'first-page' })
    const firstPageId = imported.getPages()[0]?.id
    if (firstPageId) computeAllLayouts(imported, firstPageId)
    store.replaceGraph(imported)
    store.undo.clear()
    store.setStorageDocumentSource({ providerId, documentId: document.id }, document.name)
    store.clearSelection()
    const pageId = store.graph.getPages()[0]?.id ?? store.graph.rootId
    await store.switchPage(pageId)
    await store.fitCurrentPageToViewport()
    addRecentFile({
      id: document.id,
      name: document.name,
      format: 'fig',
      updatedAt: document.updatedAt
    })
    closeHome()
  } finally {
    store.state.loading = false
  }
}

export async function openFileInNewTab(
  file: File,
  handle?: FileSystemFileHandle,
  path?: string
): Promise<void> {
  const identity: DocumentSourceIdentity = {
    handle: handle ?? null,
    path: path ?? null
  }
  const decision = await fileOpenCoordinator.decide(async () => {
    const pending = await fileOpenCoordinator.findPending(identity)
    if (pending) {
      const tab = getTabForStore(pending.store)
      if (tab) {
        switchTab(tab.id)
        closeHome()
      }
      return { kind: 'pending' as const, completion: pending.completion }
    }

    const existing = await findTabByFileIdentity(tabsAtom.get(), identity)
    if (existing) {
      switchTab(existing.id)
      closeHome()
      return { kind: 'existing' as const }
    }

    const store = reusableTabStore()
    store.state.documentName = file.name.replace(/\.[^.]+$/i, '')
    store.state.loading = true

    const completion = Promise.withResolvers<undefined>()
    void completion.promise.catch(() => undefined)
    const pendingOpen = { completion: completion.promise, identity, store }
    fileOpenCoordinator.add(pendingOpen)
    return { kind: 'owner' as const, completion, pendingOpen, store }
  })

  if (decision.kind === 'existing') return
  if (decision.kind === 'pending') {
    await decision.completion
    return
  }

  const { completion, pendingOpen, store } = decision
  try {
    if (isDOMImportFile(file)) {
      await store.openDOMFile(file, { handle, path })
      addRecentFile({
        name: file.name.replace(/\.[^.]+$/i, ''),
        path: path ?? null,
        format: 'document',
        updatedAt: new Date().toISOString()
      })
      closeHome()
      completion.resolve(undefined)
      return
    }

    await yieldToUI()
    const isFig = file.name.toLowerCase().endsWith('.fig')
    const { graph: imported, sourceFormat } = isFig
      ? { graph: await readFigFile(file, { populate: 'first-page' }), sourceFormat: 'fig' }
      : await io.readDocument({
          name: file.name,
          mimeType: file.type || undefined,
          data: new Uint8Array(await file.arrayBuffer())
        })

    const firstPageId = imported.getPages()[0]?.id
    if (firstPageId) computeAllLayouts(imported, firstPageId)
    store.replaceGraph(imported)
    store.undo.clear()
    store.setDocumentSource(file.name, sourceFormat, handle, path)
    store.clearSelection()
    const pageId = store.graph.getPages()[0]?.id ?? store.graph.rootId
    await store.switchPage(pageId)
    await store.fitCurrentPageToViewport()
    addRecentFile({
      name: file.name.replace(/\.[^.]+$/i, ''),
      path: path ?? null,
      format: file.name.toLowerCase().endsWith('.pen') ? 'pen' : 'fig',
      updatedAt: new Date().toISOString()
    })
    closeHome()
    completion.resolve(undefined)
  } catch (error) {
    completion.reject(error)
    throw error
  } finally {
    store.state.loading = false
    fileOpenCoordinator.remove(pendingOpen)
  }
}

export function openTemplateInTab(template: HomeTemplate): Tab {
  const existing = tabsAtom.get().find((t) => t.store.state.documentName === template.name)
  if (existing) {
    switchTab(existing.id)
    closeHome()
    return existing
  }

  const graph = template.createGraph()
  const firstPageId = graph.getPages()[0]?.id
  if (firstPageId) computeAllLayouts(graph, firstPageId)

  const current = activeTab.get()
  const isUntouched =
    current?.store.state.documentName === 'Untitled' && !current.store.undo.canUndo
  const tab = isUntouched ? current : createTab(undefined, graph)
  if (isUntouched) {
    tab.store.replaceGraph(graph)
  }
  tab.store.state.documentName = template.name
  tab.store.undo.clear()
  tab.store.clearSelection()
  const pageId = tab.store.graph.getPages()[0]?.id ?? tab.store.graph.rootId
  void tab.store.switchPage(pageId)
  void tab.store.fitCurrentPageToViewport()

  if (template.id === 'figma-motion') {
    propertiesActiveTab.set('motion')
  }

  addRecentFile({
    id: `template-${template.id}`,
    templateId: template.id,
    name: template.name,
    format: 'fig',
    updatedAt: new Date().toISOString()
  })
  closeHome()
  return tab
}

export function openTemplateByIdOrName(idOrName: string): Tab | undefined {
  const normalized = idOrName.toLowerCase().trim()
  const tpl = HOME_TEMPLATES.find(
    (t) => t.id.toLowerCase() === normalized || t.name.toLowerCase() === normalized
  )
  if (!tpl) return undefined
  return openTemplateInTab(tpl)
}

export function tabCount(): number {
  return tabsAtom.get().length
}

export function useTabsStore() {
  return {
    tabs: allTabs,
    activeTabId,
    createTab,
    switchTab,
    closeTab,
    getActiveTabId,
    getTabById,
    getTabForStore,
    getTabsSnapshot,
    openFileInNewTab,
    openStorageDocumentInNewTab,
    openTemplateInTab,
    openTemplateByIdOrName,
    getActiveStore,
    tabCount
  }
}
