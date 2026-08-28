import { createPenDrag, handlePenDragMove } from '#react/canvas/pen-input/drag'
import { handlePenNodeEditDown } from '#react/shared/input/node-edit'
import type { DragState } from '#react/shared/input/types'

import { PEN_CLOSE_THRESHOLD } from '@openweave/core/constants'
import type { Editor } from '@openweave/core/editor'

type SetDrag = (drag: DragState) => void

export function startPenInput(
  e: MouseEvent,
  cx: number,
  cy: number,
  editor: Editor,
  setDrag: SetDrag,
  cursorOverride: (value: string | null) => void
): boolean {
  editor.state.penCursorX = null
  editor.state.penCursorY = null

  const nodeEditState = editor.state.nodeEditState
  if (nodeEditState) {
    handlePenNodeEditDown(e, cx, cy, editor)
    return true
  }

  const isCurvature = editor.state.activeTool === 'CURVATURE_PEN'
  const penState = editor.state.penState
  if (penState && penState.vertices.length > 2) {
    const first = penState.vertices[0]
    const dist = Math.hypot(cx - first.x, cy - first.y)
    if (dist < PEN_CLOSE_THRESHOLD) {
      editor.penSetPendingClose(true)
      if (isCurvature) {
        // Curvature pen closes on click; the smooth pass shapes the joint.
        editor.penCommit(true)
        cursorOverride(null)
        return true
      }
      editor.penSetClosingToFirst(true)
      setDrag(createPenDrag(first.x, first.y))
      cursorOverride('crosshair')
      return true
    }
  }

  editor.penSetPendingClose(false)
  if (isCurvature) {
    // Click places a point and the curve re-flows through it; no tangent drag.
    editor.penAddSmoothVertex(cx, cy)
    cursorOverride('crosshair')
    return true
  }
  editor.penAddVertex(cx, cy)
  setDrag(createPenDrag(cx, cy))
  cursorOverride('crosshair')
  return true
}

export function updatePenHover(cx: number, cy: number, editor: Editor): boolean {
  const tool = editor.state.activeTool
  if ((tool !== 'PEN' && tool !== 'CURVATURE_PEN') || !editor.state.penState) return false
  editor.state.penCursorX = cx
  editor.state.penCursorY = cy

  const first = editor.state.penState.vertices[0]
  if (editor.state.penState.vertices.length > 2) {
    const dist = Math.hypot(cx - first.x, cy - first.y)
    editor.penSetClosingToFirst(dist < PEN_CLOSE_THRESHOLD)
  }
  if (tool === 'CURVATURE_PEN') {
    editor.penPreviewSmoothTangent(cx, cy)
  }
  editor.requestRepaint()
  return true
}

export { handlePenDragMove }
