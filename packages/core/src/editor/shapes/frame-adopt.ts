import type { NodeType } from '@openweave/scene-graph'

import type { EditorContext } from '#core/editor/types'

/** Containers that adopt freshly drawn nodes, like Figma: frames, components, sections. */
const ADOPTING_TYPES = new Set<NodeType>(['FRAME', 'COMPONENT', 'SECTION'])

/**
 * Figma-like auto-parenting for a freshly drawn node: nest it into the
 * deepest frame that fully contains its bounds, keeping its absolute
 * position. No-op when nothing under the node qualifies.
 */
export function adoptNodeIntoFrame(ctx: EditorContext, nodeId: string): void {
  const node = ctx.graph.getNode(nodeId)
  if (!node || node.type === 'SECTION') return

  const abs = ctx.graph.getAbsolutePosition(nodeId)
  let target = ctx.graph.hitTestFrame(
    abs.x + node.width / 2,
    abs.y + node.height / 2,
    new Set([nodeId]),
    ctx.state.currentPageId
  )
  // hitTestFrame can land on containers that don't adopt drawn nodes (groups,
  // instances); climb to the nearest ancestor that does.
  while (target && !ADOPTING_TYPES.has(target.type)) {
    target = target.parentId ? (ctx.graph.getNode(target.parentId) ?? null) : null
  }
  if (!target || target.id === node.parentId || target.id === ctx.state.currentPageId) return

  const targetAbs = ctx.graph.getAbsolutePosition(target.id)
  const contained =
    abs.x >= targetAbs.x &&
    abs.y >= targetAbs.y &&
    abs.x + node.width <= targetAbs.x + target.width &&
    abs.y + node.height <= targetAbs.y + target.height
  if (!contained) return

  const targetId = target.id
  const oldParentId = node.parentId ?? ctx.state.currentPageId
  const oldX = node.x
  const oldY = node.y
  ctx.graph.reparentNode(nodeId, targetId)
  const newX = node.x
  const newY = node.y
  ctx.runLayoutForNode(targetId)

  ctx.undo.push({
    label: 'Adopt into frame',
    forward: () => {
      ctx.graph.reparentNode(nodeId, targetId)
      ctx.graph.updateNode(nodeId, { x: newX, y: newY })
      ctx.runLayoutForNode(targetId)
    },
    inverse: () => {
      ctx.graph.reparentNode(nodeId, oldParentId)
      ctx.graph.updateNode(nodeId, { x: oldX, y: oldY })
      ctx.runLayoutForNode(targetId)
    }
  })
}
