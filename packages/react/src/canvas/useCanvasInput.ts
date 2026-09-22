import {
  handleBendHandleMove,
  handleNodeEditMouseUp,
  updateNodeEditHover
} from '#react/canvas/node-edit-input/use'
import { handlePenDragMove, updatePenHover } from '#react/canvas/pen-input/use'
import { createCanvasPointer } from '#react/canvas/pointer/use'
import {
  finishPrototypeConnect,
  handlePrototypeConnectMove
} from '#react/canvas/prototype-input/use'
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
import { computeCornerRadiusFromPointer } from '#react/shared/input/select/corner-radius'
import {
  findHoveredGuide,
  handleGuideDragMove,
  handleGuideDragUp,
  tryStartGuideDrag
} from '#react/shared/input/select/guides'
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

export interface AutoLayoutGapEditState {
  nodeId: string
  value: number
  previous: number
  x: number
  y: number
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
  const lastScreenPos = useRef({ sx: 0, sy: 0 })
  const [cursorOverride, setCursorOverride] = useState<string | null>(null)
  const [autoLayoutPaddingEdit, setAutoLayoutPaddingEdit] =
    useState<AutoLayoutPaddingEditState | null>(null)
  const [autoLayoutGapEdit, setAutoLayoutGapEdit] = useState<AutoLayoutGapEditState | null>(null)

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

  function startAutoLayoutGapEdit(e: MouseEvent): boolean {
    const { cx, cy } = getCoords(e)
    const hover = resolveAutoLayoutHover(cx, cy, editor)
    if (hover?.kind !== 'spacing' && hover?.kind !== 'spacing-value') return false
    const node = editor.graph.getNode(hover.nodeId)
    if (!node) return false
    setAutoLayoutGapEdit({
      nodeId: node.id,
      value: node.itemSpacing,
      previous: node.itemSpacing,
      x: cx,
      y: cy
    })
    e.preventDefault()
    e.stopPropagation()
    return true
  }

  function updateAutoLayoutGapEdit(value: number) {
    if (!autoLayoutGapEdit || !Number.isFinite(value)) return
    const next = Math.max(0, value)
    setAutoLayoutGapEdit({ ...autoLayoutGapEdit, value: next })
    editor.updateNode(autoLayoutGapEdit.nodeId, { itemSpacing: next })
  }

  function commitAutoLayoutGapEdit(value: number) {
    if (!autoLayoutGapEdit || !Number.isFinite(value)) {
      setAutoLayoutGapEdit(null)
      return
    }
    const next = Math.max(0, value)
    editor.updateNode(autoLayoutGapEdit.nodeId, { itemSpacing: autoLayoutGapEdit.previous })
    editor.updateNodeWithUndo(
      autoLayoutGapEdit.nodeId,
      { itemSpacing: next },
      'Update item spacing'
    )
    setAutoLayoutGapEdit(null)
  }

  function cancelAutoLayoutGapEdit() {
    if (autoLayoutGapEdit) {
      editor.updateNode(autoLayoutGapEdit.nodeId, { itemSpacing: autoLayoutGapEdit.previous })
    }
    setAutoLayoutGapEdit(null)
  }

  function onDblClick(e: MouseEvent) {
    if (startAutoLayoutPaddingEdit(e)) return
    if (startAutoLayoutGapEdit(e)) return
    onTextDblClick(e)
  }

  function onMouseDown(e: MouseEvent) {
    if (autoLayoutPaddingEdit) {
      commitAutoLayoutPaddingEdit(autoLayoutPaddingEdit.value)
    }
    if (autoLayoutGapEdit) {
      commitAutoLayoutGapEdit(autoLayoutGapEdit.value)
    }
    if (!editor.state.editingTextId) canvasRef.current?.focus()
    editor.setHoveredNode(null)
    const { sx, sy, cx, cy } = getCoords(e)
    lastScreenPos.current = { sx, sy }

    if (tryStartGuideDrag(editor, sx, sy, cx, cy, setDrag, setCursorOverride)) return

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
    lastScreenPos.current = { sx, sy }
    onCursorMove?.(cx, cy)
    editor.setPointerWorld?.({ x: cx, y: cy })

    if (!drag.current) {
      updatePenHover(cx, cy, editor)
      updateNodeEditHover(editor, cx, cy)
      if (editor.state.activeTool === 'SELECT') {
        const hoveredGuide = findHoveredGuide(editor, cx, cy, editor.state.zoom)
        if (hoveredGuide) {
          setCursorOverride(hoveredGuide.guide.axis === 'X' ? 'col-resize' : 'row-resize')
        } else {
          setCursorOverride(updateHoverCursor(cx, cy, editor, hitFns))
        }
        editor.setAutoLayoutHover(resolveAutoLayoutHover(cx, cy, editor))
        editor.setAltHeld(e.altKey)
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

    if (d.type === 'proto-connect') {
      handlePrototypeConnectMove(d, cx, cy, editor)
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

    if (d.type === 'auto-layout-padding') {
      const { side, startX, startY, initialValues, nodeId } = d
      let delta = 0
      if (side === 'top') delta = cy - startY
      else if (side === 'bottom') delta = startY - cy
      else if (side === 'left') delta = cx - startX
      else if (side === 'right') delta = startX - cx

      let nextValue = Math.max(0, initialValues[side] + delta)
      if (e.shiftKey) nextValue = Math.round(nextValue / 8) * 8
      else nextValue = Math.round(nextValue)

      const updates: Record<string, number> = {}
      if (side === 'top') {
        updates.paddingTop = nextValue
        if (e.altKey) updates.paddingBottom = nextValue
      } else if (side === 'bottom') {
        updates.paddingBottom = nextValue
        if (e.altKey) updates.paddingTop = nextValue
      } else if (side === 'left') {
        updates.paddingLeft = nextValue
        if (e.altKey) updates.paddingRight = nextValue
      } else if (side === 'right') {
        updates.paddingRight = nextValue
        if (e.altKey) updates.paddingLeft = nextValue
      }

      editor.updateNode(nodeId, updates)
      return
    }

    if (d.type === 'auto-layout-gap') {
      const { startX, startY, initialSpacing, nodeId, layoutMode } = d
      const delta = layoutMode === 'HORIZONTAL' ? cx - startX : cy - startY
      let nextSpacing = Math.max(0, initialSpacing + delta)
      if (e.shiftKey) nextSpacing = Math.round(nextSpacing / 8) * 8
      else nextSpacing = Math.round(nextSpacing)

      editor.updateNode(nodeId, { itemSpacing: nextSpacing })
      return
    }

    if (d.type === 'corner-radius') {
      const node = editor.graph.getNode(d.nodeId)
      if (node) {
        const { updates, radius } = computeCornerRadiusFromPointer(
          node,
          d.corner,
          cx,
          cy,
          editor,
          e.shiftKey,
          e.altKey
        )
        editor.updateNode(d.nodeId, updates)
        editor.setCornerRadiusDrag({ nodeId: d.nodeId, corner: d.corner, radius })
      }
      return
    }

    if (d.type === 'guide-drag') {
      handleGuideDragMove(d, editor, cx, cy, e.shiftKey)
      setCursorOverride(d.axis === 'X' ? 'col-resize' : 'row-resize')
      return
    }

    if (d.type === 'draw') {
      handleDrawMove(d, cx, cy, e.shiftKey, editor)
      return
    }

    handleMarqueeMove(d, cx, cy)
  }

  function onMouseUp(e?: MouseEvent) {
    if (!drag.current) return
    const d = drag.current

    if (handleNodeEditMouseUp(drag, editor)) return

    if (d.type === 'move') handleMoveUp(d, editor)
    else if (d.type === 'proto-connect') {
      finishPrototypeConnect(d, editor)
      drag.current = null
      setCursorOverride(null)
      return
    } else if (d.type === 'text-select') {
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
    else if (d.type === 'auto-layout-padding') {
      const node = editor.graph.getNode(d.nodeId)
      if (node) {
        editor.updateNode(d.nodeId, {
          paddingTop: d.initialValues.top,
          paddingRight: d.initialValues.right,
          paddingBottom: d.initialValues.bottom,
          paddingLeft: d.initialValues.left
        })
        editor.updateNodeWithUndo(
          d.nodeId,
          {
            paddingTop: node.paddingTop,
            paddingRight: node.paddingRight,
            paddingBottom: node.paddingBottom,
            paddingLeft: node.paddingLeft
          },
          'Update padding'
        )
      }
    } else if (d.type === 'auto-layout-gap') {
      const node = editor.graph.getNode(d.nodeId)
      if (node) {
        editor.updateNode(d.nodeId, { itemSpacing: d.initialSpacing })
        editor.updateNodeWithUndo(
          d.nodeId,
          { itemSpacing: node.itemSpacing },
          'Update item spacing'
        )
      }
    } else if (d.type === 'corner-radius') {
      const node = editor.graph.getNode(d.nodeId)
      if (node) {
        editor.updateNode(d.nodeId, {
          cornerRadius: d.initialValues.cornerRadius,
          topLeftRadius: d.initialValues.topLeftRadius,
          topRightRadius: d.initialValues.topRightRadius,
          bottomRightRadius: d.initialValues.bottomRightRadius,
          bottomLeftRadius: d.initialValues.bottomLeftRadius,
          independentCorners: d.initialValues.independentCorners
        })
        editor.updateNodeWithUndo(
          d.nodeId,
          {
            cornerRadius: node.cornerRadius,
            topLeftRadius: node.topLeftRadius,
            topRightRadius: node.topRightRadius,
            bottomRightRadius: node.bottomRightRadius,
            bottomLeftRadius: node.bottomLeftRadius,
            independentCorners: node.independentCorners
          },
          'Update corner radius'
        )
      }
      editor.setCornerRadiusDrag(null)
    } else if (d.type === 'guide-drag') {
      const sx = e ? getCoords(e).sx : lastScreenPos.current.sx
      const sy = e ? getCoords(e).sy : lastScreenPos.current.sy
      handleGuideDragUp(d, editor, sx, sy)
    }

    drag.current = null
    setCursorOverride(null)
  }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const onMouseLeave = () => {
      editor.setPointerWorld?.(null)
      if (!drag.current) {
        editor.setHoveredNode(null)
        editor.setAltHeld(false)
      }
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Alt' && !event.repeat) {
        editor.setAltHeld(true)
      }
    }
    const onKeyUp = (event: KeyboardEvent) => {
      if (event.key === 'Alt') {
        editor.setAltHeld(false)
      }
    }
    const onBlur = () => {
      editor.setAltHeld(false)
    }
    canvas.addEventListener('dblclick', onDblClick)
    canvas.addEventListener('mousedown', onMouseDown)
    canvas.addEventListener('mousemove', onMouseMove)
    canvas.addEventListener('mouseup', onMouseUp)
    canvas.addEventListener('mouseleave', onMouseLeave)
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('blur', onBlur)
    const onWindowMouseUp = (event: MouseEvent) => {
      if (drag.current) onMouseUp(event)
    }
    window.addEventListener('mouseup', onWindowMouseUp)
    const cleanupPanZoom = setupPanZoom(
      canvasRef,
      editor,
      drag,
      onMouseDown,
      onMouseMove,
      onMouseUp
    )
    return () => {
      canvas.removeEventListener('dblclick', onDblClick)
      canvas.removeEventListener('mousedown', onMouseDown)
      canvas.removeEventListener('mousemove', onMouseMove)
      canvas.removeEventListener('mouseup', onMouseUp)
      canvas.removeEventListener('mouseleave', onMouseLeave)
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('blur', onBlur)
      window.removeEventListener('mouseup', onWindowMouseUp)
      cleanupPanZoom()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoLayoutPaddingEdit, autoLayoutGapEdit, editor])

  return {
    drag,
    cursorOverride,
    autoLayoutPaddingEdit,
    updateAutoLayoutPaddingEdit,
    commitAutoLayoutPaddingEdit,
    cancelAutoLayoutPaddingEdit,
    autoLayoutGapEdit,
    updateAutoLayoutGapEdit,
    commitAutoLayoutGapEdit,
    cancelAutoLayoutGapEdit
  }
}
