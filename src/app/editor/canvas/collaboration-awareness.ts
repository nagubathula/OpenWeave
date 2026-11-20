import { useEffect } from 'react'

import { collabForStore } from '@/app/collab/tabs'
import type { EditorStore } from '@/app/editor/active-store'

/**
 * Publishes the local cursor and selection to the collaboration room of the
 * tab that owns `store` (each tab has its own room, if any).
 */
export function useCanvasCollaborationAwareness(store: EditorStore) {
  useEffect(
    () =>
      store.onEditorEvent('selection:changed', (ids) =>
        collabForStore(store)?.updateSelection(ids)
      ),
    [store]
  )

  function updateCursor(cx: number, cy: number) {
    store.state.cursorCanvasX = cx
    store.state.cursorCanvasY = cy
    collabForStore(store)?.updateCursor(cx, cy, store.state.currentPageId)
  }

  return { updateCursor }
}
