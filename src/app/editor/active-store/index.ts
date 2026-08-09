import type { EditorStore } from '@/app/editor/session'

export type { EditorStore }

let activeStore: EditorStore | undefined

export function setActiveEditorStore(store: EditorStore) {
  activeStore = store
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
