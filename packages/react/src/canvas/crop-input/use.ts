import type { DragCrop, DragState } from '#react/shared/input/types'

import {
  computeImageCornersInNode,
  defaultCropTransform,
  hitTestCrop,
  updateCropPan,
  updateCropRotate,
  updateCropScale,
  type CropCorners,
  type CropHandle
} from '@openweave/core/canvas'
import type { Editor } from '@openweave/core/editor'
import type { GradientTransform, SceneNode } from '@openweave/scene-graph'

type CanvasToLocalFn = (cx: number, cy: number, id: string) => { lx: number; ly: number }

function getEffectiveTransform(node: SceneNode, fillIndex: number): GradientTransform {
  const fill = node.fills?.[fillIndex]
  if (fill?.imageTransform) return fill.imageTransform
  return defaultCropTransform(
    node.width,
    node.height,
    node.width,
    node.height,
    fill?.imageScaleMode ?? 'CROP'
  )
}

export function startCropInput(
  _event: MouseEvent,
  cx: number,
  cy: number,
  editor: Editor,
  canvasToLocal: CanvasToLocalFn,
  setDrag: (d: DragState) => void
): boolean {
  const cropState = editor.state.cropState
  if (!cropState && editor.state.activeTool !== 'CROP') return false

  if (!cropState) return false
  const node = editor.graph.getNode(cropState.nodeId)
  if (!node) return false
  const fill = node.fills?.[cropState.fillIndex]
  if (!fill || fill.type !== 'IMAGE') return false

  const { lx, ly } = canvasToLocal(cx, cy, node.id)
  const currentTransform = getEffectiveTransform(node, cropState.fillIndex)
  const corners: CropCorners = computeImageCornersInNode(currentTransform, node.width, node.height)
  const hit = hitTestCrop({ x: lx, y: ly }, corners, 12 / editor.state.zoom)

  if (hit?.type === 'handle') {
    setDrag({
      type: 'crop',
      subType: 'scale',
      handle: hit.handle,
      startCx: cx,
      startCy: cy,
      startNodeX: lx,
      startNodeY: ly,
      origTransform: { ...currentTransform },
      nodeId: node.id,
      nodeWidth: node.width,
      nodeHeight: node.height
    })
    return true
  }

  if (hit?.type === 'rotate') {
    setDrag({
      type: 'crop',
      subType: 'rotate',
      corner: hit.corner,
      startCx: cx,
      startCy: cy,
      startNodeX: lx,
      startNodeY: ly,
      origTransform: { ...currentTransform },
      nodeId: node.id,
      nodeWidth: node.width,
      nodeHeight: node.height
    })
    return true
  }

  // Inside image or inside container bounds -> Pan image
  const inContainer = lx >= 0 && lx <= node.width && ly >= 0 && ly <= node.height
  if (hit?.type === 'inside' || inContainer) {
    setDrag({
      type: 'crop',
      subType: 'pan',
      startCx: cx,
      startCy: cy,
      startNodeX: lx,
      startNodeY: ly,
      origTransform: { ...currentTransform },
      nodeId: node.id,
      nodeWidth: node.width,
      nodeHeight: node.height
    })
    return true
  }

  // Clicked outside -> Commit and exit crop mode
  editor.exitCropMode(true)
  return true
}

export function handleCropDragMove(
  d: DragCrop,
  cx: number,
  cy: number,
  canvasToLocal: CanvasToLocalFn,
  editor: Editor,
  shiftKey: boolean
): void {
  const { lx, ly } = canvasToLocal(cx, cy, d.nodeId)

  if (d.subType === 'pan') {
    const deltaX = lx - d.startNodeX
    const deltaY = ly - d.startNodeY
    const nextTransform = updateCropPan(d.origTransform, deltaX, deltaY, d.nodeWidth, d.nodeHeight)
    editor.setCropTransform(nextTransform)
    return
  }

  if (d.subType === 'scale') {
    const handle: CropHandle = d.handle ?? 'br'
    const nextTransform = updateCropScale(
      d.origTransform,
      handle,
      { x: lx, y: ly },
      d.nodeWidth,
      d.nodeHeight
    )
    editor.setCropTransform(nextTransform)
    return
  }

  if (d.subType === 'rotate') {
    const corners = computeImageCornersInNode(d.origTransform, d.nodeWidth, d.nodeHeight)
    const center = { x: (corners.tl.x + corners.br.x) / 2, y: (corners.tl.y + corners.br.y) / 2 }
    const v1 = { x: d.startNodeX - center.x, y: d.startNodeY - center.y }
    const v2 = { x: lx - center.x, y: ly - center.y }
    const angle1 = Math.atan2(v1.y, v1.x)
    const angle2 = Math.atan2(v2.y, v2.x)
    let deltaAngle = angle2 - angle1
    if (shiftKey) {
      const step = Math.PI / 12
      deltaAngle = Math.round(deltaAngle / step) * step
    }
    const nextTransform = updateCropRotate(d.origTransform, deltaAngle, d.nodeWidth, d.nodeHeight)
    editor.setCropTransform(nextTransform)
  }
}

export function updateCropHoverCursor(
  cx: number,
  cy: number,
  editor: Editor,
  canvasToLocal: CanvasToLocalFn
): string | null {
  const cropState = editor.state.cropState
  if (!cropState) return null
  const node = editor.graph.getNode(cropState.nodeId)
  if (!node) return null

  const { lx, ly } = canvasToLocal(cx, cy, node.id)
  const currentTransform = getEffectiveTransform(node, cropState.fillIndex)
  const corners = computeImageCornersInNode(currentTransform, node.width, node.height)
  const hit = hitTestCrop({ x: lx, y: ly }, corners, 10 / editor.state.zoom)

  if (!hit) return null

  if (hit.type === 'handle') {
    switch (hit.handle) {
      case 'tl':
      case 'br':
        return 'nwse-resize'
      case 'tr':
      case 'bl':
        return 'nesw-resize'
      case 't':
      case 'b':
        return 'ns-resize'
      case 'l':
      case 'r':
        return 'ew-resize'
    }
  }

  if (hit.type === 'rotate') return 'crosshair'
  if (hit.type === 'inside') return 'move'
  return null
}
