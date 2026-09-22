import type { Canvas, Paint } from 'canvaskit-wasm'

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
  sy: number,
  fillPaint?: Paint
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

  canvas.drawRRect(rect, fillPaint ?? r.snapFill)
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
  const isDev = Boolean(overlays.devMode)
  if (!overlays.altHeld && !isDev) return

  const strokePaint = isDev && r.redlinePaint ? r.redlinePaint : r.snapPaint
  const dashPaint = isDev && r.redlineDashPaint ? r.redlineDashPaint : r.snapDashPaint
  const fillPaint = isDev && r.redlineFill ? r.redlineFill : r.snapFill

  if (selectedIds.size === 0) {
    if (isDev && overlays.hoveredNodeId) {
      const hNode = graph.getNode(overlays.hoveredNodeId)
      if (hNode && hNode.id !== graph.rootId && hNode.type !== 'CANVAS') {
        const bounds = computeNodeBounds(hNode, graph)
        const x1 = bounds.x * r.zoom + r.panX
        const y1 = bounds.y * r.zoom + r.panY
        const x2 = (bounds.x + bounds.width) * r.zoom + r.panX
        const y2 = (bounds.y + bounds.height) * r.zoom + r.panY
        canvas.drawRect(r.ck.LTRBRect(x1, y1, x2, y2), strokePaint)
        drawMeasurementPill(
          r,
          canvas,
          `${Math.round(bounds.width)} × ${Math.round(bounds.height)}`,
          (x1 + x2) / 2,
          y2 + 10,
          fillPaint
        )
      }
    }
    return
  }

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

  // 1. Highlight target node boundary
  const tx1 = tBounds.x * r.zoom + r.panX
  const ty1 = tBounds.y * r.zoom + r.panY
  const tx2 = (tBounds.x + tBounds.width) * r.zoom + r.panX
  const ty2 = (tBounds.y + tBounds.height) * r.zoom + r.panY
  canvas.drawRect(r.ck.LTRBRect(tx1, ty1, tx2, ty2), strokePaint)

  // 2. Compute guides
  const guides = computeDistanceGuides(sBounds, tBounds)

  for (const guide of guides) {
    if (guide.projection) {
      if (guide.projection.axis === 'y') {
        const px = guide.projection.position * r.zoom + r.panX
        const py1 = guide.projection.from * r.zoom + r.panY
        const py2 = guide.projection.to * r.zoom + r.panY
        canvas.drawLine(px, py1, px, py2, dashPaint)
      } else {
        const py = guide.projection.position * r.zoom + r.panY
        const px1 = guide.projection.from * r.zoom + r.panX
        const px2 = guide.projection.to * r.zoom + r.panX
        canvas.drawLine(px1, py, px2, py, dashPaint)
      }
    }

    const TICK = 3.5
    if (guide.axis === 'x') {
      const lineY = guide.crossPosition * r.zoom + r.panY
      const lineX1 = guide.start * r.zoom + r.panX
      const lineX2 = guide.end * r.zoom + r.panX
      canvas.drawLine(lineX1, lineY, lineX2, lineY, strokePaint)
      if (isDev) {
        canvas.drawLine(lineX1, lineY - TICK, lineX1, lineY + TICK, strokePaint)
        canvas.drawLine(lineX2, lineY - TICK, lineX2, lineY + TICK, strokePaint)
      }
      drawMeasurementPill(
        r,
        canvas,
        `${Math.round(guide.distance)}${isDev ? 'px' : ''}`,
        (lineX1 + lineX2) / 2,
        lineY,
        fillPaint
      )
    } else {
      const lineX = guide.crossPosition * r.zoom + r.panX
      const lineY1 = guide.start * r.zoom + r.panY
      const lineY2 = guide.end * r.zoom + r.panY
      canvas.drawLine(lineX, lineY1, lineX, lineY2, strokePaint)
      if (isDev) {
        canvas.drawLine(lineX - TICK, lineY1, lineX + TICK, lineY1, strokePaint)
        canvas.drawLine(lineX - TICK, lineY2, lineX + TICK, lineY2, strokePaint)
      }
      drawMeasurementPill(
        r,
        canvas,
        `${Math.round(guide.distance)}${isDev ? 'px' : ''}`,
        lineX,
        (lineY1 + lineY2) / 2,
        fillPaint
      )
    }
  }
}
