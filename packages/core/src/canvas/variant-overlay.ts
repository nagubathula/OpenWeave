import type { Canvas } from 'canvaskit-wasm'

import type { SceneGraph, SceneNode } from '@openweave/scene-graph'
import { getAbsolutePosition } from '@openweave/scene-graph/coordinate'
import type { Vector } from '@openweave/scene-graph/primitives'

import { COMPONENT_COLOR } from '#core/constants'

import type { SkiaRenderer } from './renderer'

const BUTTON_RADIUS = 10
// Clears the selection size badge drawn under the set's bottom edge.
const BUTTON_GAP = 28
const PLUS_SIZE = 4.5

/** Screen-space hit radius for the add-variant button (matched by the input layer). */
export const VARIANT_ADD_HIT_RADIUS = 12

/**
 * The node an add-variant button applies to for the current selection: a
 * selected component set, the set containing a selected variant, or a
 * standalone component (which the action converts into a set).
 */
export function variantAddTarget(
  graph: SceneGraph,
  selectedIds: ReadonlySet<string>
): SceneNode | null {
  if (selectedIds.size !== 1) return null
  const node = graph.getNode([...selectedIds][0])
  if (!node) return null
  if (node.type === 'COMPONENT_SET') return node
  if (node.type !== 'COMPONENT') return null
  const parent = node.parentId ? graph.getNode(node.parentId) : null
  return parent?.type === 'COMPONENT_SET' ? parent : node
}

/** World-space center of the add-variant button, below the set's bottom edge. */
export function variantAddButtonPosition(
  graph: SceneGraph,
  set: SceneNode,
  zoom: number
): Vector {
  const abs = getAbsolutePosition(set, graph)
  return {
    x: abs.x + set.width / 2,
    y: abs.y + set.height + (BUTTON_GAP + BUTTON_RADIUS) / zoom
  }
}

/** Figma-style "+" button under a selected component set for adding a variant. */
export function drawVariantOverlay(
  r: SkiaRenderer,
  canvas: Canvas,
  graph: SceneGraph,
  selectedIds: ReadonlySet<string>
): void {
  const set = variantAddTarget(graph, selectedIds)
  if (!set) return

  const world = variantAddButtonPosition(graph, set, r.zoom)
  const x = world.x * r.zoom + r.panX
  const y = world.y * r.zoom + r.panY

  const { r: cr, g, b } = COMPONENT_COLOR
  r.auxFill.setColor(r.ck.Color4f(cr, g, b, 1))
  canvas.drawCircle(x, y, BUTTON_RADIUS, r.auxFill)

  r.auxStroke.setColor(r.ck.Color4f(1, 1, 1, 1))
  r.auxStroke.setStrokeWidth(1.6)
  r.auxStroke.setPathEffect(null)
  canvas.drawLine(x - PLUS_SIZE, y, x + PLUS_SIZE, y, r.auxStroke)
  canvas.drawLine(x, y - PLUS_SIZE, x, y + PLUS_SIZE, r.auxStroke)
}
