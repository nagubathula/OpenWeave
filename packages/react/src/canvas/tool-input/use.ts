import { startCropInput } from '#react/canvas/crop-input/use'
import { startPenInput } from '#react/canvas/pen-input/use'
import { startPrototypeConnect } from '#react/canvas/prototype-input/use'
import { handleVariantAddClick } from '#react/canvas/variant-input/use'
import { startShapeDraw, startTextDraw } from '#react/shared/input/draw'
import { startPanDrag } from '#react/shared/input/pan'
import { handleSelectDown } from '#react/shared/input/select'
import type { HitTestFns } from '#react/shared/input/select'
import type { DragState } from '#react/shared/input/types'

import type { Editor } from '@openweave/core/editor'

type ToolMouseDownOptions = {
  event: MouseEvent
  cx: number
  cy: number
  sx: number
  sy: number
  editor: Editor
  hitFns: HitTestFns
  cursorOverride: (value: string | null) => void
  setDrag: (d: DragState) => void
  tryStartRotation: (cx: number, cy: number) => boolean
  handleTextEditClick: (cx: number, cy: number, shiftKey: boolean) => boolean
  canvasToLocal?: (cx: number, cy: number, id: string) => { lx: number; ly: number }
}

export { startPanDrag }

export function handleToolMouseDown({
  event,
  cx,
  cy,
  sx,
  sy,
  editor,
  hitFns,
  cursorOverride,
  setDrag,
  tryStartRotation,
  handleTextEditClick,
  canvasToLocal
}: ToolMouseDownOptions) {
  const tool = editor.state.activeTool

  if (event.button === 1 || tool === 'HAND') {
    startPanDrag(event, setDrag, editor)
    return
  }

  if (tool === 'CROP' || editor.state.cropState != null) {
    if (canvasToLocal && startCropInput(event, cx, cy, editor, canvasToLocal, setDrag)) {
      return
    }
  }

  if (tool === 'SELECT') {
    if (handleVariantAddClick(cx, cy, editor)) return
    if (startPrototypeConnect(cx, cy, editor, setDrag)) return
    handleSelectDown(
      event,
      cx,
      cy,
      sx,
      sy,
      editor,
      hitFns,
      tryStartRotation,
      handleTextEditClick,
      setDrag
    )
    return
  }

  if (tool === 'BEND') {
    if (!editor.state.nodeEditState) {
      const hit = hitFns.hitTestInScope(cx, cy, true)
      if (hit) {
        const nodeEditEditor = editor as Editor &
          Partial<{ enterNodeEditMode: (id: string) => void }>
        nodeEditEditor.enterNodeEditMode?.(hit.id)
      }
    }
    handleSelectDown(
      event,
      cx,
      cy,
      sx,
      sy,
      editor,
      hitFns,
      tryStartRotation,
      handleTextEditClick,
      setDrag
    )
    return
  }

  if (tool === 'PEN' || tool === 'CURVATURE_PEN') {
    startPenInput(event, cx, cy, editor, setDrag, cursorOverride)
    return
  }

  if (tool === 'TEXT') {
    startTextDraw(cx, cy, editor, setDrag)
    return
  }

  startShapeDraw(cx, cy, editor, setDrag)
}
