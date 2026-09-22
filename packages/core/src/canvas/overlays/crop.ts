import type { Canvas } from 'canvaskit-wasm'

import type { SceneGraph } from '@openweave/scene-graph'
import { getWorldMatrix } from '@openweave/scene-graph/coordinate'

import { computeImageCornersInNode, defaultCropTransform } from '#core/canvas/crop-math'
import type { RenderOverlays, SkiaRenderer } from '#core/canvas/renderer'

export function drawCropOverlay(
  r: SkiaRenderer,
  canvas: Canvas,
  graph: SceneGraph,
  cropState?: RenderOverlays['cropState']
): void {
  if (!cropState) return
  const node = graph.getNode(cropState.nodeId)
  if (!node) return
  const fill = node.fills?.[cropState.fillIndex]
  if (!fill || fill.type !== 'IMAGE') return

  const img = fill.imageHash ? r.imageCache.get(fill.imageHash) : undefined
  const imgW = img ? img.width() : node.width
  const imgH = img ? img.height() : node.height

  const transform =
    fill.imageTransform ??
    defaultCropTransform(node.width, node.height, imgW, imgH, fill.imageScaleMode ?? 'CROP')

  const corners = computeImageCornersInNode(transform, node.width, node.height)
  const worldMatrix = getWorldMatrix(node, graph)

  canvas.save()
  canvas.translate(r.panX, r.panY)
  canvas.scale(r.zoom, r.zoom)
  canvas.concat(worldMatrix)

  const strokeW = 1 / r.zoom

  // 1. Uncropped image boundary (dashed outline)
  r.auxStroke.setStrokeWidth(strokeW)
  r.auxStroke.setColor(r.ck.Color4f(0.2, 0.6, 1.0, 0.7))
  r.auxStroke.setPathEffect(r.ck.PathEffect.MakeDash([4 / r.zoom, 4 / r.zoom], 0))

  const imgPath = new r.ck.Path()
  imgPath.moveTo(corners.tl.x, corners.tl.y)
  imgPath.lineTo(corners.tr.x, corners.tr.y)
  imgPath.lineTo(corners.br.x, corners.br.y)
  imgPath.lineTo(corners.bl.x, corners.bl.y)
  imgPath.close()
  canvas.drawPath(imgPath, r.auxStroke)
  r.auxStroke.setPathEffect(null)

  // 2. Rule of thirds grid lines inside container
  r.auxStroke.setColor(r.ck.Color4f(1, 1, 1, 0.4))
  r.auxStroke.setStrokeWidth(strokeW)

  const x1 = node.width / 3
  const x2 = (2 * node.width) / 3
  const y1 = node.height / 3
  const y2 = (2 * node.height) / 3

  canvas.drawLine(x1, 0, x1, node.height, r.auxStroke)
  canvas.drawLine(x2, 0, x2, node.height, r.auxStroke)
  canvas.drawLine(0, y1, node.width, y1, r.auxStroke)
  canvas.drawLine(0, y2, node.width, y2, r.auxStroke)

  // 3. Container boundary (solid selection highlight)
  r.selectionPaint.setStrokeWidth(1.5 / r.zoom)
  r.selectionPaint.setColor(r.selColor())
  canvas.drawRect(r.ck.XYWHRect(0, 0, node.width, node.height), r.selectionPaint)

  // 4. Image handles at corners and edges
  const handlePoints = [
    corners.tl,
    corners.tr,
    corners.br,
    corners.bl,
    { x: (corners.tl.x + corners.tr.x) / 2, y: (corners.tl.y + corners.tr.y) / 2 },
    { x: (corners.tr.x + corners.br.x) / 2, y: (corners.tr.y + corners.br.y) / 2 },
    { x: (corners.bl.x + corners.br.x) / 2, y: (corners.bl.y + corners.br.y) / 2 },
    { x: (corners.tl.x + corners.bl.x) / 2, y: (corners.tl.y + corners.bl.y) / 2 }
  ]

  for (const pt of handlePoints) {
    r.drawHandle(canvas, pt.x, pt.y)
  }

  // 5. If in TILE mode, draw tile repeat grid
  if (fill.imageScaleMode === 'TILE') {
    const tileW = Math.abs(corners.tr.x - corners.tl.x)
    const tileH = Math.abs(corners.bl.y - corners.tl.y)
    if (tileW > 8 && tileH > 8) {
      r.auxStroke.setColor(r.ck.Color4f(0.3, 0.8, 1.0, 0.25))
      r.auxStroke.setPathEffect(r.ck.PathEffect.MakeDash([2 / r.zoom, 4 / r.zoom], 0))
      for (let tx = ((corners.tl.x % tileW) + tileW) % tileW; tx < node.width; tx += tileW) {
        if (tx > 0) canvas.drawLine(tx, 0, tx, node.height, r.auxStroke)
      }
      for (let ty = ((corners.tl.y % tileH) + tileH) % tileH; ty < node.height; ty += tileH) {
        if (ty > 0) canvas.drawLine(0, ty, node.width, ty, r.auxStroke)
      }
      r.auxStroke.setPathEffect(null)
    }
  }

  imgPath.delete()
  canvas.restore()
}
