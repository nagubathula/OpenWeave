import type { Editor } from '@openweave/core/editor'

import { panelMessages } from '#react/i18n/messages'
import type { DragOriginal } from '#react/shared/input/drag-original'
import type { DragState } from '#react/shared/input/types'

export function duplicateAndDrag(
  cx: number,
  cy: number,
  sx: number,
  sy: number,
  editor: Editor
): { originals: Map<string, DragOriginal>; drag: DragState } {
  const previousSelection = new Set(editor.state.selectedIds)
  // Read the message atom directly — this runs inside a pointer handler, not a
  // React render, so hooks (useI18n/useStore) must not be called here.
  const panels = panelMessages.get()
  const newIds: string[] = []
  const newOriginals = new Map<string, DragOriginal>()
  for (const id of previousSelection) {
    const source = editor.graph.getNode(id)
    if (!source) continue
    const parentId = source.parentId ?? editor.state.currentPageId
    const clone = editor.graph.cloneTree(id, parentId, {
      name: source.name + (panels.nodeCopyString || ' copy')
    })
    if (!clone) continue
    newIds.push(clone.id)
    newOriginals.set(clone.id, {
      x: source.x,
      y: source.y,
      parentId
    })
  }
  editor.select(newIds)
  editor.requestRender()
  return {
    originals: newOriginals,
    drag: {
      type: 'move',
      startX: cx,
      startY: cy,
      currentX: cx,
      currentY: cy,
      startScreenX: sx,
      startScreenY: sy,
      dragStarted: true,
      originals: newOriginals,
      duplicated: true,
      duplicatedPreviousSelection: previousSelection
    }
  }
}
