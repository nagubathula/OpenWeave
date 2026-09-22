import { getNodeEditState, handleNodeEditDown } from '#react/shared/input/node-edit'
export { resolveHit } from '#react/shared/input/select/hit'
import { resolveHit } from '#react/shared/input/select/hit'
export { updateHoverCursor } from '#react/shared/input/select/hover'
import { tryStartResize } from '#react/shared/input/resize'
import { hitTestCornerRadius } from '#react/shared/input/select/corner-radius'
import { createSelectionMoveDrag, selectionIsLocked } from '#react/shared/input/select/move'
import type { DragState } from '#react/shared/input/types'

import type { Editor } from '@openweave/core/editor'
import type { SceneNode } from '@openweave/scene-graph'

export interface HitTestFns {
  hitTestInScope: (cx: number, cy: number, deep: boolean) => SceneNode | null
  isInsideContainerBounds: (cx: number, cy: number, containerId: string) => boolean
  hitTestSectionTitle: (cx: number, cy: number) => SceneNode | null
  hitTestComponentLabel: (cx: number, cy: number) => SceneNode | null
  hitTestFrameTitle: (cx: number, cy: number) => SceneNode | null
}

export function handleSelectDown(
  e: MouseEvent,
  cx: number,
  cy: number,
  sx: number,
  sy: number,
  editor: Editor,
  fns: HitTestFns,
  tryStartRotation: (cx: number, cy: number) => boolean,
  handleTextEditClick: (cx: number, cy: number, shiftKey: boolean) => boolean,
  setDrag: (d: DragState) => void
) {
  // Node edit mode intercept
  if (getNodeEditState(editor)) {
    handleNodeEditDown(e, cx, cy, editor, setDrag)
    return
  }

  if (editor.state.editingTextId && handleTextEditClick(cx, cy, e.shiftKey)) return

  if (editor.state.editingTextId) editor.commitTextEdit()

  if (tryStartRotation(cx, cy)) return

  const resizeDrag = tryStartResize(cx, cy, editor)
  if (resizeDrag) {
    setDrag(resizeDrag)
    return
  }

  // Corner radius drag intercept
  const cornerHit = hitTestCornerRadius(cx, cy, editor)
  if (cornerHit) {
    const node = editor.graph.getNode(cornerHit.nodeId)
    if (node) {
      setDrag({
        type: 'corner-radius',
        nodeId: node.id,
        corner: cornerHit.corner,
        startX: cx,
        startY: cy,
        initialValues: {
          cornerRadius: node.cornerRadius,
          topLeftRadius: node.topLeftRadius,
          topRightRadius: node.topRightRadius,
          bottomRightRadius: node.bottomRightRadius,
          bottomLeftRadius: node.bottomLeftRadius,
          independentCorners: node.independentCorners
        }
      })
      return
    }
  }

  // Auto layout padding & gap drag intercept
  const alHover = editor.state.autoLayoutHover
  if (alHover && editor.state.selectedIds.has(alHover.nodeId)) {
    const node = editor.graph.getNode(alHover.nodeId)
    if (node && (node.layoutMode === 'HORIZONTAL' || node.layoutMode === 'VERTICAL')) {
      if ((alHover.kind === 'padding' || alHover.kind === 'padding-value') && alHover.side) {
        setDrag({
          type: 'auto-layout-padding',
          nodeId: node.id,
          side: alHover.side,
          startX: cx,
          startY: cy,
          initialValues: {
            top: node.paddingTop,
            right: node.paddingRight,
            bottom: node.paddingBottom,
            left: node.paddingLeft
          }
        })
        return
      }
      if (alHover.kind === 'spacing' || alHover.kind === 'spacing-value') {
        setDrag({
          type: 'auto-layout-gap',
          nodeId: node.id,
          startX: cx,
          startY: cy,
          initialSpacing: node.itemSpacing,
          layoutMode: node.layoutMode
        })
        return
      }
    }
  }

  const hit = resolveHit(cx, cy, editor, fns)
  if (!hit) {
    if (!editor.state.enteredContainerId) {
      editor.clearSelection()
      setDrag({ type: 'marquee', startX: cx, startY: cy })
    }
    return
  }

  if (!editor.state.selectedIds.has(hit.id) && !e.shiftKey) {
    editor.select([hit.id])
  } else if (e.shiftKey) {
    editor.select([hit.id], true)
  }

  if (selectionIsLocked(editor)) return

  setDrag(createSelectionMoveDrag(cx, cy, sx, sy, editor, e.altKey))
}
