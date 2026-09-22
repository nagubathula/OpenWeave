import type { Canvas } from 'canvaskit-wasm'

import {
  computeDistanceGuides,
  computeNodeBounds,
  computeNodesAABB,
  type SceneGraph,
  type SceneNode
} from '@openweave/scene-graph'

import type { RenderOverlays, SkiaRenderer } from '#core/canvas/renderer'

function resolveMeasurementTarget(
  graph: SceneGraph,
  selectedIds: Set<string>,
  hoveredNodeId?: string | null
): SceneNode | null {
  if (hoveredNodeId && !selectedIds.has(hoveredNodeId)) {
    const node = graph.getNode(hoveredNodeId)
    if (node && node.id !== graph.rootId && node.type !== 'CANVAS') return node
  }

  if (selectedIds.size === 1) {
    const sel = graph.getNode([...selectedIds][0])
    if (sel?.parentId) {
      const parent = graph.getNode(sel.parentId)
      if (parent && parent.id !== graph.rootId && parent.type !== 'CANVAS') {
        return parent
      }
    }
  }

  return null
}

function drawMeasurementPill(
  r: SkiaRenderer,
  canvas: Canvas,
  text: string,
  sx: number,
  sy: number
): void {
  const font = r.sizeFont ?? r.textFont
  if (!font) return

  let textWidth = text.length * 7
  try {
    const glyphs = font.getGlyphIDs(text)
    const widths = font.getGlyphWidths(glyphs)
    textWidth = widths.reduce((acc, w) => acc + w, 0)
  } catch {
    // fallback
  }

  const padX = 4
  const pillW = Math.max(16, textWidth + padX * 2)
  const pillH = 14

  const rect = r.ck.RRectXY(
    r.ck.LTRBRect(sx - pillW / 2, sy - pillH / 2, sx + pillW / 2, sy + pillH / 2),
    2,
    2
  )

  canvas.drawRRect(rect, r.snapFill)
  r.auxFill.setColor(r.ck.WHITE)
  canvas.drawText(text, sx - textWidth / 2, sy + 4, r.auxFill, font)
}

export function drawDistanceMeasurements(
  r: SkiaRenderer,
  canvas: Canvas,
  graph: SceneGraph,
  selectedIds: Set<string>,
  overlays: RenderOverlays
): void {
  if (!overlays.altHeld || selectedIds.size === 0) return

  const targetNode = resolveMeasurementTarget(graph, selectedIds, overlays.hoveredNodeId)
  if (!targetNode) return

  const selectedNodes: SceneNode[] = []
  for (const id of selectedIds) {
    const n = graph.getNode(id)
    if (n) selectedNodes.push(n)
  }
  if (selectedNodes.length === 0) return

  const sBounds = computeNodesAABB(selectedNodes, graph)
  if (!sBounds) return
  const tBounds = computeNodeBounds(targetNode, graph)

  // 1. Highlight target node boundary in snap magenta
  const tx1 = tBounds.x * r.zoom + r.panX
  const ty1 = tBounds.y * r.zoom + r.panY
  const tx2 = (tBounds.x + tBounds.width) * r.zoom + r.panX
  const ty2 = (tBounds.y + tBounds.height) * r.zoom + r.panY
  canvas.drawRect(r.ck.LTRBRect(tx1, ty1, tx2, ty2), r.snapPaint)

  // 2. Compute guides
  const guides = computeDistanceGuides(sBounds, tBounds)

  for (const guide of guides) {
    if (guide.projection) {
      if (guide.projection.axis === 'y') {
        const px = guide.projection.position * r.zoom + r.panX
        const py1 = guide.projection.from * r.zoom + r.panY
        const py2 = guide.projection.to * r.zoom + r.panY
        canvas.drawLine(px, py1, px, py2, r.snapDashPaint)
      } else {
        const py = guide.projection.position * r.zoom + r.panY
        const px1 = guide.projection.from * r.zoom + r.panX
        const px2 = guide.projection.to * r.zoom + r.panX
        canvas.drawLine(px1, py, px2, py, r.snapDashPaint)
      }
    }

    if (guide.axis === 'x') {
      const lineY = guide.crossPosition * r.zoom + r.panY
      const lineX1 = guide.start * r.zoom + r.panX
      const lineX2 = guide.end * r.zoom + r.panX
      canvas.drawLine(lineX1, lineY, lineX2, lineY, r.snapPaint)
      drawMeasurementPill(r, canvas, `${Math.round(guide.distance)}`, (lineX1 + lineX2) / 2, lineY)
    } else {
      const lineX = guide.crossPosition * r.zoom + r.panX
      const lineY1 = guide.start * r.zoom + r.panY
      const lineY2 = guide.end * r.zoom + r.panY
      canvas.drawLine(lineX, lineY1, lineX, lineY2, r.snapPaint)
      drawMeasurementPill(r, canvas, `${Math.round(guide.distance)}`, lineX, (lineY1 + lineY2) / 2)
    }
  }
}
