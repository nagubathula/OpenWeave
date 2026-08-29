import type { Canvas, Paint } from 'canvaskit-wasm'

import type { SceneGraph, SceneNode } from '@openweave/scene-graph'
import { getAbsolutePosition } from '@openweave/scene-graph/coordinate'
import type { Vector } from '@openweave/scene-graph/primitives'

import { SELECTION_COLOR } from '#core/constants'

import type { SkiaRenderer } from './renderer'

export interface PrototypeOverlayState {
  enabled?: boolean
  selectedIds?: Set<string>
  hoveredNodeId?: string | null
  drag?: { sourceId: string; cursorX: number; cursorY: number } | null
}

interface PrototypeLink {
  from: SceneNode
  to: SceneNode
}

const ANCHOR_RADIUS = 4
const HANDLE_RADIUS = 5
const ARROW_SIZE = 7

/** Screen-space hit radius for the connector handle (matched by the input layer). */
export const PROTOTYPE_HANDLE_HIT_RADIUS = 10

/** World position of a node's connector handle: the right-edge midpoint. */
export function prototypeHandlePosition(graph: SceneGraph, node: SceneNode): Vector {
  const abs = getAbsolutePosition(node, graph)
  return { x: abs.x + node.width, y: abs.y + node.height / 2 }
}

function collectLinks(graph: SceneGraph, pageId: string): PrototypeLink[] {
  const page = graph.getNode(pageId)
  if (!page) return []
  const links: PrototypeLink[] = []
  const stack = [...page.childIds]
  while (stack.length > 0) {
    const node = graph.getNode(stack.pop() as string)
    if (!node) continue
    for (const reaction of node.reactions) {
      if (reaction.action !== 'NAVIGATE' || !reaction.destinationId) continue
      const dest = graph.getNode(reaction.destinationId)
      if (dest) links.push({ from: node, to: dest })
    }
    stack.push(...node.childIds)
  }
  return links
}

/**
 * Pick facing edge midpoints: connect the source's edge nearest the
 * destination to the destination's opposing edge, like Figma's noodles.
 */
function linkAnchors(
  graph: SceneGraph,
  link: PrototypeLink
): { start: Vector; end: Vector; horizontal: boolean } {
  const fromAbs = getAbsolutePosition(link.from, graph)
  const toAbs = getAbsolutePosition(link.to, graph)
  const fromCx = fromAbs.x + link.from.width / 2
  const fromCy = fromAbs.y + link.from.height / 2
  const toCx = toAbs.x + link.to.width / 2
  const toCy = toAbs.y + link.to.height / 2
  const dx = toCx - fromCx
  const dy = toCy - fromCy

  if (Math.abs(dx) >= Math.abs(dy)) {
    const start = { x: dx >= 0 ? fromAbs.x + link.from.width : fromAbs.x, y: fromCy }
    const end = { x: dx >= 0 ? toAbs.x : toAbs.x + link.to.width, y: toCy }
    return { start, end, horizontal: true }
  }
  const start = { x: fromCx, y: dy >= 0 ? fromAbs.y + link.from.height : fromAbs.y }
  const end = { x: toCx, y: dy >= 0 ? toAbs.y : toAbs.y + link.to.height }
  return { start, end, horizontal: false }
}

function drawNoodle(
  r: SkiaRenderer,
  canvas: Canvas,
  s: Vector,
  e: Vector,
  horizontal: boolean,
  stroke: Paint,
  fill: Paint
): void {
  const reach = Math.min(80, Math.hypot(e.x - s.x, e.y - s.y) / 2)
  const dir = horizontal ? Math.sign(e.x - s.x) || 1 : Math.sign(e.y - s.y) || 1
  const cp1 = horizontal ? { x: s.x + reach * dir, y: s.y } : { x: s.x, y: s.y + reach * dir }
  const cp2 = horizontal ? { x: e.x - reach * dir, y: e.y } : { x: e.x, y: e.y - reach * dir }

  const path = new r.ck.Path()
  path.moveTo(s.x, s.y)
  path.cubicTo(cp1.x, cp1.y, cp2.x, cp2.y, e.x, e.y)
  canvas.drawPath(path, stroke)
  path.delete()

  canvas.drawCircle(s.x, s.y, ANCHOR_RADIUS, fill)

  const tip = new r.ck.Path()
  if (horizontal) {
    tip.moveTo(e.x, e.y)
    tip.lineTo(e.x - ARROW_SIZE * dir, e.y - ARROW_SIZE * 0.6)
    tip.lineTo(e.x - ARROW_SIZE * dir, e.y + ARROW_SIZE * 0.6)
  } else {
    tip.moveTo(e.x, e.y)
    tip.lineTo(e.x - ARROW_SIZE * 0.6, e.y - ARROW_SIZE * dir)
    tip.lineTo(e.x + ARROW_SIZE * 0.6, e.y - ARROW_SIZE * dir)
  }
  tip.close()
  canvas.drawPath(tip, fill)
  tip.delete()
}

/** Nodes that show a drag-out connector handle: top-level frames plus the hovered/selected nodes. */
function handleNodes(graph: SceneGraph, pageId: string, state: PrototypeOverlayState): SceneNode[] {
  const seen = new Set<string>()
  const nodes: SceneNode[] = []
  const add = (id: string | null | undefined) => {
    if (!id || seen.has(id)) return
    const node = graph.getNode(id)
    if (!node || !node.visible) return
    seen.add(id)
    nodes.push(node)
  }
  const page = graph.getNode(pageId)
  for (const childId of page?.childIds ?? []) add(childId)
  for (const id of state.selectedIds ?? []) add(id)
  add(state.hoveredNodeId)
  return nodes
}

export function drawPrototypeOverlay(
  r: SkiaRenderer,
  canvas: Canvas,
  graph: SceneGraph,
  state?: PrototypeOverlayState
): void {
  if (!state?.enabled || !r.pageId) return

  const toScreen = (x: number, y: number): Vector => ({
    x: x * r.zoom + r.panX,
    y: y * r.zoom + r.panY
  })

  const { r: cr, g, b } = SELECTION_COLOR
  r.auxStroke.setColor(r.ck.Color4f(cr, g, b, 1))
  r.auxStroke.setStrokeWidth(2)
  r.auxStroke.setPathEffect(null)
  r.auxFill.setColor(r.ck.Color4f(cr, g, b, 1))

  for (const link of collectLinks(graph, r.pageId)) {
    const { start, end, horizontal } = linkAnchors(graph, link)
    drawNoodle(
      r,
      canvas,
      toScreen(start.x, start.y),
      toScreen(end.x, end.y),
      horizontal,
      r.auxStroke,
      r.auxFill
    )
  }

  // Live connection being dragged out of a handle.
  const drag = state.drag
  if (drag) {
    const source = graph.getNode(drag.sourceId)
    if (source) {
      const handle = prototypeHandlePosition(graph, source)
      const s = toScreen(handle.x, handle.y)
      const e = toScreen(drag.cursorX, drag.cursorY)
      drawNoodle(r, canvas, s, e, true, r.auxStroke, r.auxFill)

      // Highlight the frame the connection would land on.
      const page = graph.getNode(r.pageId)
      for (const childId of page?.childIds ?? []) {
        const frame = graph.getNode(childId)
        if (!frame || !frame.visible || frame.id === drag.sourceId) continue
        const abs = getAbsolutePosition(frame, graph)
        const inside =
          drag.cursorX >= abs.x &&
          drag.cursorX <= abs.x + frame.width &&
          drag.cursorY >= abs.y &&
          drag.cursorY <= abs.y + frame.height
        if (!inside) continue
        const tl = toScreen(abs.x, abs.y)
        const br = toScreen(abs.x + frame.width, abs.y + frame.height)
        canvas.drawRect(r.ck.LTRBRect(tl.x, tl.y, br.x, br.y), r.auxStroke)
        break
      }
    }
  }

  // Drag-out connector handles: hollow circles on the right edge.
  const white = r.ck.Color4f(1, 1, 1, 1)
  for (const node of handleNodes(graph, r.pageId, state)) {
    if (drag && node.id === drag.sourceId) continue
    const pos = prototypeHandlePosition(graph, node)
    const p = toScreen(pos.x, pos.y)
    r.auxFill.setColor(white)
    canvas.drawCircle(p.x, p.y, HANDLE_RADIUS, r.auxFill)
    canvas.drawCircle(p.x, p.y, HANDLE_RADIUS, r.auxStroke)
  }
  r.auxFill.setColor(r.ck.Color4f(cr, g, b, 1))
}
