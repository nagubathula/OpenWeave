import {
  handleBendHandleMove,
  handleNodeEditMouseUp,
  updateNodeEditHover
} from '#react/canvas/node-edit-input/use'
import { handlePenDragMove, updatePenHover } from '#react/canvas/pen-input/use'
import { createCanvasPointer } from '#react/canvas/pointer/use'
import { createTextEditInput } from '#react/canvas/text-edit/input'
import { handleToolMouseDown } from '#react/canvas/tool-input/use'
import { createCanvasTransformInput } from '#react/canvas/transform-input/use'
import { resolveAutoLayoutHover } from '#react/shared/input/auto-layout-hover'
import { createClickCounter } from '#react/shared/input/click-count'
import { handleDrawMove, handleDrawUp } from '#react/shared/input/draw'
import { handleMoveMove, handleMoveUp } from '#react/shared/input/move'
import { handleNodeEditMove } from '#react/shared/input/node-edit'
import { setupPanZoom } from '#react/shared/input/pan-zoom'
import { applyResize, commitResizePreview } from '#react/shared/input/resize'
import { updateHoverCursor } from '#react/shared/input/select'
import { useSpaceHeld } from '#react/shared/input/space-key'
import type { DragState } from '#react/shared/input/types'
import { useEffect, useRef, useState, type RefObject } from 'react'

import type { Editor } from '@openweave/core/editor'
import type { SceneNode } from '@openweave/scene-graph'

export interface AutoLayoutPaddingEditState {
  nodeId: string
  side: 'top' | 'right' | 'bottom' | 'left'
  value: number
  previous: number
}

/**
 * Wires pointer and mouse interaction to an OpenWeave canvas.
 *
 * This composable coordinates selection, dragging, resizing, rotation,
 * panning, drawing tools, scoped hit testing, and text-edit interaction.
 * It is primarily intended for editor shell components that own the canvas.
 */
export function useCanvasInput(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  editor: Editor,
  hitTestSectionTitle: (cx: number, cy: number) => SceneNode | null,
  hitTestComponentLabel: (cx: number, cy: number) => SceneNode | null,
  hitTestFrameTitle: (cx: number, cy: number) => SceneNode | null,
  onCursorMove?: (cx: number, cy: number) => void
) {
  const drag = useRef<DragState | null>(null)
  const [cursorOverride, setCursorOverride] = useState<string | null>(null)
  const [autoLayoutPaddingEdit, setAutoLayoutPaddingEdit] = useState<AutoLayoutPaddingEditState | null>(null)
  
  const selectedIdsBeforeClickSequence = useRef<ReadonlySet<string>>(new Set())
  const spaceHeld = useSpaceHeld()
  const { recordClick, getClickCount } = createClickCounter()

  const { getCoords, canvasToLocal, hitTestInScope, hitFns } = createCanvasPointer(
    canvasRef,
    editor,
    hitTestSectionTitle,
    hitTestComponentLabel,
    hitTestFrameTitle
  )

  function setDrag(d: DragState) {
    drag.current = d
  }

  const { handleTextEditClick, onDblClick: onTextDblClick } = createTextEditInput({
    editor,
    getCoords,
    hitTestInScope,
    hitTestSectionTitle,
    hitTestComponentLabel,
    getClickCount,
    wasSelectedBeforeClickSequence: (id) => selectedIdsBeforeClickSequence.current.has(id),
    setDrag
  })

  const {
    tryStartRotation,
    handlePanMove,
    handleRotateMove,
    handleTextSelectMove,
    handleMarqueeMove
  } = createCanvasTransformInput(editor, canvasToLocal, setDrag)

  function paddingValue(node: SceneNode, side: 'top' | 'right' | 'bottom' | 'left') {
    if (side === 'top') return node.paddingTop
    if (side === 'right') return node.paddingRight
    if (side === 'bottom') return node.paddingBottom
    return node.paddingLeft
  }

  function paddingKey(side: 'top' | 'right' | 'bottom' | 'left') {
    if (side === 'top') return 'paddingTop' as const
    if (side === 'right') return 'paddingRight' as const
    if (side === 'bottom') return 'paddingBottom' as const
    return 'paddingLeft' as const
  }

  function startAutoLayoutPaddingEdit(e: MouseEvent): boolean {
    const { cx, cy } = getCoords(e)
    const hover = resolveAutoLayoutHover(cx, cy, editor)
    if (hover?.kind !== 'padding' && hover?.kind !== 'padding-value') return false
    if (!hover.side) return false
    const node = editor.graph.getNode(hover.nodeId)
    if (!node) return false
    const value = paddingValue(node, hover.side)
    setAutoLayoutPaddingEdit({
      nodeId: node.id,
      side: hover.side,
      value,
      previous: value
    })
    e.preventDefault()
    e.stopPropagation()
    return true
  }

  function updateAutoLayoutPaddingEdit(value: number) {
    if (!autoLayoutPaddingEdit || !Number.isFinite(value)) return
    const next = Math.max(0, value)
    setAutoLayoutPaddingEdit({ ...autoLayoutPaddingEdit, value: next })
    editor.updateNode(autoLayoutPaddingEdit.nodeId, {
      [paddingKey(autoLayoutPaddingEdit.side)]: next
    })
  }

  function commitAutoLayoutPaddingEdit(value: number) {
    if (!autoLayoutPaddingEdit || !Number.isFinite(value)) {
      setAutoLayoutPaddingEdit(null)
      return
    }
    const next = Math.max(0, value)
    editor.updateNode(autoLayoutPaddingEdit.nodeId, {
      [paddingKey(autoLayoutPaddingEdit.side)]: autoLayoutPaddingEdit.previous
    })
    editor.updateNodeWithUndo(
      autoLayoutPaddingEdit.nodeId,
      { [paddingKey(autoLayoutPaddingEdit.side)]: next },
      'Update padding'
    )
    setAutoLayoutPaddingEdit(null)
  }

  function cancelAutoLayoutPaddingEdit() {
    if (autoLayoutPaddingEdit)
      editor.updateNode(autoLayoutPaddingEdit.nodeId, {
        [paddingKey(autoLayoutPaddingEdit.side)]: autoLayoutPaddingEdit.previous
      })
    setAutoLayoutPaddingEdit(null)
  }

  function onDblClick(e: MouseEvent) {
    if (startAutoLayoutPaddingEdit(e)) return
    onTextDblClick(e)
  }

  function onMouseDown(e: MouseEvent) {
    if (autoLayoutPaddingEdit) {
      commitAutoLayoutPaddingEdit(autoLayoutPaddingEdit.value)
    }
    if (!editor.state.editingTextId) canvasRef.current?.focus()
    editor.setHoveredNode(null)
    const { sx, sy, cx, cy } = getCoords(e)

    const selectedIdsBeforeMouseDown = new Set(editor.state.selectedIds)
    if (recordClick(sx, sy) === 1) {
      selectedIdsBeforeClickSequence.current = selectedIdsBeforeMouseDown
    }

    handleToolMouseDown({
      event: e,
      cx,
      cy,
      sx,
      sy,
      editor,
      hitFns,
      cursorOverride: setCursorOverride,
      setDrag,
      tryStartRotation,
      handleTextEditClick
    })
  }

  function onMouseMove(e: MouseEvent) {
    const { sx, sy, cx, cy } = getCoords(e)
    onCursorMove?.(cx, cy)

    if (!drag.current) {
      updatePenHover(cx, cy, editor)
      updateNodeEditHover(editor, cx, cy)
      if (editor.state.activeTool === 'SELECT') {
        setCursorOverride(updateHoverCursor(cx, cy, editor, hitFns))
        editor.setAutoLayoutHover(resolveAutoLayoutHover(cx, cy, editor))
      }
      return
    }

    const d = drag.current

    if (d.type === 'pan') {
      handlePanMove(d, e)
      return
    }

    if (d.type === 'rotate') {
      handleRotateMove(d, cx, cy, e.shiftKey)
      return
    }
    if (d.type === 'move') {
      handleMoveMove(d, cx, cy, sx, sy, editor)
      return
    }
    if (d.type === 'text-select') {
      handleTextSelectMove(cx, cy)
      return
    }
    if (d.type === 'resize') {
      applyResize(d, cx, cy, e.shiftKey, editor)
      return
    }

    if (d.type === 'pen-drag') {
      handlePenDragMove(d, cx, cy, spaceHeld.current, e, editor)
      return
    }

    if (d.type === 'edit-node' || d.type === 'edit-handle') {
      handleNodeEditMove(d, cx, cy, editor, e.altKey, e.metaKey || e.ctrlKey, e.shiftKey)
      return
    }

    if (d.type === 'bend-handle') {
      handleBendHandleMove(d, cx, cy, e, editor)
      return
    }

    if (d.type === 'draw') {
      handleDrawMove(d, cx, cy, e.shiftKey, editor)
      return
    }

    handleMarqueeMove(d, cx, cy)
  }

  function onMouseUp() {
    if (!drag.current) return
    const d = drag.current

    if (handleNodeEditMouseUp(drag, editor)) return

    if (d.type === 'move') handleMoveUp(d, editor)
    else if (d.type === 'text-select') {
      drag.current = null
      return
    } else if (d.type === 'resize') commitResizePreview(d, editor)
    else if (d.type === 'pen-drag') {
      const penState = editor.state.penState as
        | (typeof editor.state.penState & {
            pendingClose?: boolean
          })
        | null
      if (penState?.pendingClose) {
        editor.penCommit(true)
      }
      drag.current = null
      return
    } else if (d.type === 'rotate') {
      const preview = editor.state.rotationPreview
      if (preview) {
        editor.updateNode(d.nodeId, { rotation: preview.angle })
        editor.commitRotation(d.nodeId, d.origRotation)
      }
      editor.setRotationPreview(null)
    } else if (d.type === 'draw') handleDrawUp(d, editor)
    else if (d.type === 'marquee') editor.setMarquee(null)

    drag.current = null
    setCursorOverride(null)
  }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const onMouseLeave = () => {
      if (!drag.current) editor.setHoveredNode(null)
    }
    canvas.addEventListener('dblclick', onDblClick)
    canvas.addEventListener('mousedown', onMouseDown)
    canvas.addEventListener('mousemove', onMouseMove)
    canvas.addEventListener('mouseup', onMouseUp)
    canvas.addEventListener('mouseleave', onMouseLeave)
    const onWindowMouseUp = () => {
      if (drag.current) onMouseUp()
    }
    window.addEventListener('mouseup', onWindowMouseUp)
    const cleanupPanZoom = setupPanZoom(canvasRef, editor, drag, onMouseDown, onMouseMove, onMouseUp)
    return () => {
      canvas.removeEventListener('dblclick', onDblClick)
      canvas.removeEventListener('mousedown', onMouseDown)
      canvas.removeEventListener('mousemove', onMouseMove)
      canvas.removeEventListener('mouseup', onMouseUp)
      canvas.removeEventListener('mouseleave', onMouseLeave)
      window.removeEventListener('mouseup', onWindowMouseUp)
      cleanupPanZoom()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoLayoutPaddingEdit])

  return {
    drag,
    cursorOverride,
    autoLayoutPaddingEdit,
    updateAutoLayoutPaddingEdit,
    commitAutoLayoutPaddingEdit,
    cancelAutoLayoutPaddingEdit
  }
}
