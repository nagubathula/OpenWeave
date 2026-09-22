import type { Editor } from '@openweave/core/editor'
import type { SceneNode } from '@openweave/scene-graph'
import { getWorldMatrix } from '@openweave/scene-graph/coordinate'
import Matrix from '@openweave/scene-graph/matrix'

export type CornerId = 'tl' | 'tr' | 'br' | 'bl'

export interface CornerRadiusHit {
  nodeId: string
  corner: CornerId
  localX: number
  localY: number
}

export function nodeSupportsCornerRadius(node: SceneNode): boolean {
  return (
    node.type === 'RECTANGLE' ||
    node.type === 'FRAME' ||
    node.type === 'COMPONENT' ||
    node.type === 'INSTANCE'
  )
}

export function hitTestCornerRadius(
  cx: number,
  cy: number,
  editor: Editor
): CornerRadiusHit | null {
  if (editor.state.selectedIds.size !== 1) return null
  const id = [...editor.state.selectedIds][0]
  const node = editor.graph.getNode(id)
  if (!node || !nodeSupportsCornerRadius(node)) return null

  const zoom = editor.renderer?.zoom ?? editor.state.zoom ?? 1
  const minDim = Math.min(node.width, node.height)
  if (minDim * zoom < 36) return null

  const maxRadius = Math.floor(minDim / 2)
  const tlRadius = node.independentCorners ? node.topLeftRadius : node.cornerRadius
  const trRadius = node.independentCorners ? node.topRightRadius : node.cornerRadius
  const brRadius = node.independentCorners ? node.bottomRightRadius : node.cornerRadius
  const blRadius = node.independentCorners ? node.bottomLeftRadius : node.cornerRadius

  const d_tl = Math.max(12, Math.min(maxRadius - 4, (tlRadius ?? 0) + 10))
  const d_tr = Math.max(12, Math.min(maxRadius - 4, (trRadius ?? 0) + 10))
  const d_br = Math.max(12, Math.min(maxRadius - 4, (brRadius ?? 0) + 10))
  const d_bl = Math.max(12, Math.min(maxRadius - 4, (blRadius ?? 0) + 10))

  const corners: Array<{ corner: CornerId; lx: number; ly: number }> = [
    { corner: 'tl', lx: d_tl, ly: d_tl },
    { corner: 'tr', lx: node.width - d_tr, ly: d_tr },
    { corner: 'br', lx: node.width - d_br, ly: node.height - d_br },
    { corner: 'bl', lx: d_bl, ly: node.height - d_bl }
  ]

  const world = getWorldMatrix(node, editor.graph)
  const hitDistance = 8 / zoom

  for (const item of corners) {
    const pt = Matrix.mapPoints(world, [item.lx, item.ly])
    const dist = Math.hypot(cx - pt[0], cy - pt[1])
    if (dist <= hitDistance) {
      return {
        nodeId: node.id,
        corner: item.corner,
        localX: item.lx,
        localY: item.ly
      }
    }
  }

  return null
}

export function computeCornerRadiusFromPointer(
  node: SceneNode,
  corner: CornerId,
  cx: number,
  cy: number,
  editor: Editor,
  shiftKey: boolean,
  altKey: boolean
): { updates: Partial<SceneNode>; radius: number } {
  const world = getWorldMatrix(node, editor.graph)
  const inv = Matrix.invert(world)
  if (!inv) return { updates: {}, radius: 0 }
  const localPt = Matrix.mapPoints(inv, [cx, cy])
  const lx = localPt[0]
  const ly = localPt[1]

  let r = 0
  if (corner === 'tl') {
    r = (lx + ly) / 2
  } else if (corner === 'tr') {
    r = (node.width - lx + ly) / 2
  } else if (corner === 'br') {
    r = (node.width - lx + (node.height - ly)) / 2
  } else if (corner === 'bl') {
    r = (lx + (node.height - ly)) / 2
  }

  const maxRadius = Math.floor(Math.min(node.width, node.height) / 2)
  let rounded = Math.round(r)
  if (shiftKey) {
    rounded = Math.round(rounded / 8) * 8
  }
  const clamped = Math.max(0, Math.min(maxRadius, rounded))

  const updates: Partial<SceneNode> = {}
  if (altKey) {
    updates.independentCorners = true
    if (corner === 'tl') updates.topLeftRadius = clamped
    else if (corner === 'tr') updates.topRightRadius = clamped
    else if (corner === 'br') updates.bottomRightRadius = clamped
    else if (corner === 'bl') updates.bottomLeftRadius = clamped
  } else {
    updates.independentCorners = false
    updates.cornerRadius = clamped
    updates.topLeftRadius = clamped
    updates.topRightRadius = clamped
    updates.bottomRightRadius = clamped
    updates.bottomLeftRadius = clamped
  }

  return { updates, radius: clamped }
}
