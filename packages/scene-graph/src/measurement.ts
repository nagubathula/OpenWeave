import { getAbsolutePositionFull } from './coordinate'
import type { SceneGraph, SceneNode } from './index'
import type { Rect } from './primitives'

export interface DistanceGuide {
  axis: 'x' | 'y'
  start: number
  end: number
  crossPosition: number
  distance: number
  projection?: {
    axis: 'x' | 'y'
    position: number
    from: number
    to: number
  }
}

export function computeNodesAABB(nodes: SceneNode[], graph: SceneGraph): Rect | null {
  if (nodes.length === 0) return null

  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity

  for (const node of nodes) {
    const full = getAbsolutePositionFull(node, graph)
    minX = Math.min(minX, full.boundX)
    minY = Math.min(minY, full.boundY)
    maxX = Math.max(maxX, full.boundX + full.width)
    maxY = Math.max(maxY, full.boundY + full.height)
  }

  if (!Number.isFinite(minX)) return null

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY
  }
}

export function computeNodeBounds(node: SceneNode, graph: SceneGraph): Rect {
  const full = getAbsolutePositionFull(node, graph)
  return {
    x: full.boundX,
    y: full.boundY,
    width: full.width,
    height: full.height
  }
}

function makeProjection(
  axis: 'x' | 'y',
  position: number,
  lim1: number,
  lim2: number
): NonNullable<DistanceGuide['projection']> {
  return {
    axis,
    position,
    from: Math.min(lim1, lim2),
    to: Math.max(lim1, lim2)
  }
}

export function computeDistanceGuides(s: Rect, t: Rect): DistanceGuide[] {
  const guides: DistanceGuide[] = []

  const sx1 = s.x
  const sy1 = s.y
  const sx2 = s.x + s.width
  const sy2 = s.y + s.height
  const scx = (sx1 + sx2) / 2
  const scy = (sy1 + sy2) / 2

  const tx1 = t.x
  const ty1 = t.y
  const tx2 = t.x + t.width
  const ty2 = t.y + t.height
  const tcx = (tx1 + tx2) / 2
  const tcy = (ty1 + ty2) / 2

  const tContainsS = tx1 <= sx1 + 0.5 && tx2 >= sx2 - 0.5 && ty1 <= sy1 + 0.5 && ty2 >= sy2 - 0.5
  if (tContainsS) {
    if (sy1 - ty1 > 0.5)
      guides.push({ axis: 'y', start: ty1, end: sy1, crossPosition: scx, distance: sy1 - ty1 })
    if (ty2 - sy2 > 0.5)
      guides.push({ axis: 'y', start: sy2, end: ty2, crossPosition: scx, distance: ty2 - sy2 })
    if (sx1 - tx1 > 0.5)
      guides.push({ axis: 'x', start: tx1, end: sx1, crossPosition: scy, distance: sx1 - tx1 })
    if (tx2 - sx2 > 0.5)
      guides.push({ axis: 'x', start: sx2, end: tx2, crossPosition: scy, distance: tx2 - sx2 })
    return guides
  }

  const sContainsT = sx1 <= tx1 + 0.5 && sx2 >= tx2 - 0.5 && sy1 <= ty1 + 0.5 && sy2 >= ty2 - 0.5
  if (sContainsT) {
    if (ty1 - sy1 > 0.5)
      guides.push({ axis: 'y', start: sy1, end: ty1, crossPosition: tcx, distance: ty1 - sy1 })
    if (sy2 - ty2 > 0.5)
      guides.push({ axis: 'y', start: ty2, end: sy2, crossPosition: tcx, distance: sy2 - ty2 })
    if (tx1 - sx1 > 0.5)
      guides.push({ axis: 'x', start: sx1, end: tx1, crossPosition: tcy, distance: tx1 - sx1 })
    if (sx2 - tx2 > 0.5)
      guides.push({ axis: 'x', start: tx2, end: sx2, crossPosition: tcy, distance: sx2 - tx2 })
    return guides
  }

  // Horizontal evaluation
  const isTargetRight = tx1 >= sx2 - 0.5
  const isTargetLeft = sx1 >= tx2 - 0.5
  if (isTargetRight || isTargetLeft) {
    const startX = isTargetRight ? sx2 : tx2
    const endX = isTargetRight ? tx1 : sx1
    const dist = endX - startX
    if (dist > 0.5) {
      const yOverlapStart = Math.max(sy1, ty1)
      const yOverlapEnd = Math.min(sy2, ty2)
      if (yOverlapStart < yOverlapEnd) {
        guides.push({
          axis: 'x',
          start: startX,
          end: endX,
          crossPosition: (yOverlapStart + yOverlapEnd) / 2,
          distance: dist
        })
      } else {
        const projX = isTargetRight ? tx1 : tx2
        guides.push({
          axis: 'x',
          start: startX,
          end: endX,
          crossPosition: scy,
          distance: dist,
          projection: makeProjection('y', projX, scy, isTargetRight ? ty1 : ty2)
        })
      }
    }
  }

  // Vertical evaluation
  const isTargetBelow = ty1 >= sy2 - 0.5
  const isTargetAbove = sy1 >= ty2 - 0.5
  if (isTargetBelow || isTargetAbove) {
    const startY = isTargetBelow ? sy2 : ty2
    const endY = isTargetBelow ? ty1 : sy1
    const dist = endY - startY
    if (dist > 0.5) {
      const xOverlapStart = Math.max(sx1, tx1)
      const xOverlapEnd = Math.min(sx2, tx2)
      if (xOverlapStart < xOverlapEnd) {
        guides.push({
          axis: 'y',
          start: startY,
          end: endY,
          crossPosition: (xOverlapStart + xOverlapEnd) / 2,
          distance: dist
        })
      } else {
        const projY = isTargetBelow ? ty1 : ty2
        guides.push({
          axis: 'y',
          start: startY,
          end: endY,
          crossPosition: scx,
          distance: dist,
          projection: makeProjection('x', projY, scx, isTargetBelow ? tx1 : tx2)
        })
      }
    }
  }

  return guides
}
