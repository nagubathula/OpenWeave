import type { Canvas } from 'canvaskit-wasm'

import type { SceneGraph } from '@openweave/scene-graph'

import { RULER_SIZE, SELECTION_COLOR } from '#core/constants'

import type { SkiaRenderer } from './renderer'

interface RawGuide {
  axis?: string
  offset?: number
}

function rawGuides(graph: SceneGraph, pageId?: string | null): RawGuide[] {
  const pageNode = graph.getNode(pageId ?? graph.rootId)
  const guides = pageNode?.source.fig.rawNodeFields.guides
  if (!Array.isArray(guides)) return []
  return guides.filter((guide): guide is RawGuide => guide !== null && typeof guide === 'object')
}

function drawGuideBadge(
  r: SkiaRenderer,
  canvas: Canvas,
  label: string,
  sx: number,
  sy: number
): void {
  const font = r.sizeFont ?? r.textFont
  if (!font) return

  let textWidth = label.length * 7
  try {
    const glyphs = font.getGlyphIDs(label)
    const widths = font.getGlyphWidths(glyphs)
    textWidth = widths.reduce((acc, w) => acc + w, 0)
  } catch {
    // fallback
  }

  const padX = 5
  const pillW = Math.max(20, textWidth + padX * 2)
  const pillH = 16

  const rect = r.ck.RRectXY(
    r.ck.LTRBRect(sx - pillW / 2, sy - pillH / 2, sx + pillW / 2, sy + pillH / 2),
    3,
    3
  )

  canvas.drawRRect(rect, r.snapFill)
  r.auxFill.setColor(r.ck.WHITE)
  canvas.drawText(label, sx - textWidth / 2, sy + 4, r.auxFill, font)
}

export function drawPageGuides(
  r: SkiaRenderer,
  canvas: Canvas,
  graph: SceneGraph,
  activeGuide?: { axis: 'X' | 'Y'; offset: number } | null
): void {
  const guides = rawGuides(graph, r.pageId)
  if (guides.length === 0 && !activeGuide) return

  r.auxStroke.setStrokeWidth(1)
  r.auxStroke.setColor(r.ck.Color4f(SELECTION_COLOR.r, SELECTION_COLOR.g, SELECTION_COLOR.b, 0.65))

  for (const guide of guides) {
    if (typeof guide.offset !== 'number') continue
    if (guide.axis === 'X') {
      const x = guide.offset * r.zoom + r.panX
      canvas.drawRect(r.ck.LTRBRect(x, 0, x + 1, r.viewportHeight), r.auxStroke)
    } else if (guide.axis === 'Y') {
      const y = guide.offset * r.zoom + r.panY
      canvas.drawRect(r.ck.LTRBRect(0, y, r.viewportWidth, y + 1), r.auxStroke)
    }
  }

  if (activeGuide && typeof activeGuide.offset === 'number') {
    r.auxStroke.setColor(r.ck.Color4f(SELECTION_COLOR.r, SELECTION_COLOR.g, SELECTION_COLOR.b, 1.0))
    if (activeGuide.axis === 'X') {
      const sx = activeGuide.offset * r.zoom + r.panX
      canvas.drawRect(r.ck.LTRBRect(sx, 0, sx + 1, r.viewportHeight), r.auxStroke)
      const badgeX = Math.max(RULER_SIZE + 24, Math.min(r.viewportWidth - 30, sx))
      drawGuideBadge(r, canvas, `X: ${Math.round(activeGuide.offset)}`, badgeX, RULER_SIZE + 14)
    } else if (activeGuide.axis === 'Y') {
      const sy = activeGuide.offset * r.zoom + r.panY
      canvas.drawRect(r.ck.LTRBRect(0, sy, r.viewportWidth, sy + 1), r.auxStroke)
      const badgeY = Math.max(RULER_SIZE + 14, Math.min(r.viewportHeight - 20, sy))
      drawGuideBadge(r, canvas, `Y: ${Math.round(activeGuide.offset)}`, RULER_SIZE + 28, badgeY)
    }
  }
}
