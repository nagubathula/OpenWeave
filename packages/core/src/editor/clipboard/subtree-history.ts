import type { SceneGraph, SceneNode } from '@openweave/scene-graph'

export function collectSubtrees(graph: SceneGraph, rootIds: string[]): SceneNode[] {
  const result: SceneNode[] = []
  const visited = new Set<string>()
  function walk(id: string) {
    if (visited.has(id)) return
    visited.add(id)
    const node = graph.getNode(id)
    if (!node) return
    result.push(structuredClone(node))
    for (const childId of node.childIds) walk(childId)
  }
  for (const id of rootIds) walk(id)
  return result
}

export function snapshotSubtree(graph: SceneGraph, rootId: string): Map<string, SceneNode> {
  const index = new Map<string, SceneNode>()
  const visited = new Set<string>()
  const walk = (id: string) => {
    if (visited.has(id)) return
    visited.add(id)
    const node = graph.getNode(id)
    if (!node) return
    index.set(id, structuredClone(node))
    for (const childId of node.childIds) walk(childId)
  }
  walk(rootId)
  return index
}

export function restoreSubtree(
  graph: SceneGraph,
  snapshot: SceneNode,
  parentId: string,
  index: Map<string, SceneNode>,
  visited: Set<string> = new Set()
): void {
  if (visited.has(snapshot.id)) return
  visited.add(snapshot.id)
  const { parentId: _parentId, childIds, ...rest } = snapshot
  graph.createNode(snapshot.type, parentId, { ...rest, id: snapshot.id })
  for (const childId of childIds) {
    const child = index.get(childId)
    if (child) restoreSubtree(graph, child, snapshot.id, index, visited)
  }
}
