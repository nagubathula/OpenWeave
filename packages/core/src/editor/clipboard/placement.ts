import { isNotNil } from 'es-toolkit/predicate'

import { computeBounds } from '@openweave/scene-graph/geometry'

import type { EditorContext } from '#core/editor/types'

export function createClipboardPlacementActions(ctx: EditorContext) {
  function centerNodesAt(nodeIds: string[], cx: number, cy: number) {
    const items = nodeIds.map((id) => ctx.graph.getNode(id)).filter(isNotNil)
    const bounds = computeBounds(items)
    if (bounds.width === 0 && bounds.height === 0 && items.length === 0) return
    if (
      !Number.isFinite(bounds.x) ||
      !Number.isFinite(bounds.y) ||
      !Number.isFinite(bounds.width) ||
      !Number.isFinite(bounds.height)
    ) {
      return
    }
    const dx = cx - (bounds.x + bounds.width / 2)
    const dy = cy - (bounds.y + bounds.height / 2)
    if (!Number.isFinite(dx) || !Number.isFinite(dy)) return
    for (const id of nodeIds) {
      const node = ctx.graph.getNode(id)
      if (node) ctx.graph.updateNode(id, { x: node.x + dx, y: node.y + dy })
    }
  }

  return { centerNodesAt }
}
