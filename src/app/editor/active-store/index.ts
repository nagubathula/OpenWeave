import type { EditorStore } from '@/app/editor/session'

export type { EditorStore }

let activeStore: EditorStore | undefined
const activeStoreListeners = new Set<() => void>()

export function setActiveEditorStore(store: EditorStore) {
  if (store === activeStore) return
  activeStore = store
  for (const listener of activeStoreListeners) listener()
}

/** Fires whenever the active store instance is swapped (tab switches). */
export function onActiveEditorStoreChange(listener: () => void): () => void {
  activeStoreListeners.add(listener)
  return () => activeStoreListeners.delete(listener)
}

export function getActiveEditorStore(): EditorStore {
  if (!activeStore) throw new Error('Editor store not provided')
  return activeStore
}

export function getActiveEditorStoreOrNull(): EditorStore | null {
  return activeStore ?? null
}

const storeProxy = new Proxy({} as EditorStore, {
  get(_, prop) {
    return Reflect.get(getActiveEditorStore(), prop)
  }
})

export function useEditorStore(): EditorStore {
  return storeProxy
}
