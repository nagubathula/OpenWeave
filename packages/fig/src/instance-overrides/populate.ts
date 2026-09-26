import type { SceneGraph } from '@openweave/scene-graph'

/**
 * Populate empty INSTANCE nodes from their source components.
 *
 * Instances must be populated bottom-up: if an instance's source is
 * itself an unpopulated instance, populate the source first so cloned
 * children are complete.
 */
function collectSubtreeIds(graph: SceneGraph, rootIds: Iterable<string>): Set<string> {
  const result = new Set<string>()
  const queue = [...rootIds]
  let index = 0
  while (index < queue.length) {
    const id = queue[index]
    index++
    if (result.has(id)) continue
    result.add(id)
    const node = graph.getNode(id)
    if (node) queue.push(...node.childIds)
  }
  return result
}

export const MAX_INSTANCE_DEPTH = 12

export function wouldCreateComponentCycle(
  graph: SceneGraph,
  nodeId: string,
  componentId: string
): boolean {
  if (nodeId === componentId) return true
  let curr = graph.getNode(nodeId)
  let instanceDepth = 0
  const visitedAncestors = new Set<string>([nodeId])
  while (curr?.parentId) {
    if (visitedAncestors.has(curr.parentId)) return true
    visitedAncestors.add(curr.parentId)
    curr = graph.getNode(curr.parentId)
    if (!curr) break
    if (curr.id === componentId) return true
    if (curr.type === 'INSTANCE') {
      instanceDepth++
      if (instanceDepth > MAX_INSTANCE_DEPTH) return true
      if (curr.componentId === componentId) return true
    }
  }
  return false
}

export function populateInstances(
  graph: SceneGraph,
  rootIds?: Iterable<string>
): Set<string> | undefined {
  const visiting = new Set<string>()

  function ensurePopulated(nodeId: string): void {
    const node = graph.getNode(nodeId)
    if (node?.type !== 'INSTANCE' || !node.componentId || node.childIds.length > 0) return
    if (visiting.has(nodeId)) return
    if (wouldCreateComponentCycle(graph, nodeId, node.componentId)) return
    visiting.add(nodeId)

    const comp = graph.getNode(node.componentId)
    if (!comp) return

    if (comp.type === 'INSTANCE' && comp.componentId && comp.childIds.length === 0) {
      ensurePopulated(comp.id)
    }
    for (const childId of comp.childIds) {
      const child = graph.getNode(childId)
      if (child?.type === 'INSTANCE' && child.componentId && child.childIds.length === 0) {
        ensurePopulated(childId)
      }
    }

    if (comp.childIds.length > 0 && node.childIds.length === 0) {
      graph.populateInstanceChildren(nodeId, node.componentId, 'fig-import')
    }
  }

  if (!rootIds) {
    const candidateNodes = Array.from(graph.nodes.values())
    for (const node of candidateNodes) {
      if (node.type === 'INSTANCE' && node.componentId && node.childIds.length === 0) {
        ensurePopulated(node.id)
      }
    }
    return undefined
  }

  const queue = [...rootIds]
  const visited = new Set<string>()
  let index = 0
  while (index < queue.length) {
    const nodeId = queue[index]
    index++
    if (!nodeId || visited.has(nodeId)) continue
    visited.add(nodeId)
    ensurePopulated(nodeId)
    const node = graph.getNode(nodeId)
    if (!node) continue
    queue.push(...node.childIds)
  }
  return collectSubtreeIds(graph, rootIds)
}
