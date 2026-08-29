import type { DragOriginal } from '#react/shared/input/drag-original'
import type { DragState } from '#react/shared/input/types'

import type { Editor } from '@openweave/core/editor'
import { duplicateNodeName } from '@openweave/scene-graph'

export function duplicateAndDrag(
  cx: number,
  cy: number,
  sx: number,
  sy: number,
  editor: Editor
): { originals: Map<string, DragOriginal>; drag: DragState } {
  const previousSelection = new Set(editor.state.selectedIds)
  const newIds: string[] = []
  const newOriginals = new Map<string, DragOriginal>()
  for (const id of previousSelection) {
    const source = editor.graph.getNode(id)
    if (!source) continue
    const parentId = source.parentId ?? editor.state.currentPageId
    const clone = editor.graph.cloneTree(id, parentId, {
      name: duplicateNodeName(editor.graph, source.name, parentId)
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
