import type { SceneGraph, SceneNode } from './'
import { cloneNodeProps, copyEffects, copyFills, copyStrokes, copyStyleRuns } from './copy'
import type { NodeCloneMode } from './copy'

export type { NodeCloneMode } from './copy'

export const INSTANCE_SYNC_PROPS: (keyof SceneNode)[] = [
  'width',
  'height',
  'minWidth',
  'maxWidth',
  'minHeight',
  'maxHeight',
  'fills',
  'strokes',
  'effects',
  'opacity',
  'cornerRadius',
  'topLeftRadius',
  'topRightRadius',
  'bottomRightRadius',
  'bottomLeftRadius',
  'independentCorners',
  'layoutMode',
  'layoutDirection',
  'layoutWrap',
  'primaryAxisAlign',
  'counterAxisAlign',
  'primaryAxisSizing',
  'counterAxisSizing',
  'itemSpacing',
  'counterAxisSpacing',
  'paddingTop',
  'paddingRight',
  'paddingBottom',
  'paddingLeft',
  'gridTemplateColumns',
  'gridTemplateRows',
  'gridColumnGap',
  'gridRowGap',
  'gridPosition',
  'clipsContent',
  'independentStrokeWeights',
  'borderTopWeight',
  'borderRightWeight',
  'borderBottomWeight',
  'borderLeftWeight',
  'boundVariables',
  'variableModes'
]

/**
 * Extra child-level props synced from main-component children on top of
 * INSTANCE_SYNC_PROPS (see syncChildren). An override key `${childId}:${prop}`
 * on the enclosing instance shields any of these from sync.
 */
export const INSTANCE_CHILD_TEXT_SYNC_PROPS = [
  'name',
  'text',
  'fontSize',
  'fontWeight',
  'fontFamily',
  'textDirection'
] as const

function setSceneProp<K extends keyof SceneNode>(
  target: Partial<SceneNode>,
  key: K,
  value: SceneNode[K]
): void {
  target[key] = value
}

function copyProp(
  target: Partial<SceneNode> | SceneNode,
  source: SceneNode,
  key: keyof SceneNode
): void {
  if (key === 'fills') {
    setSceneProp(target, key, copyFills(source.fills))
  } else if (key === 'strokes') {
    setSceneProp(target, key, copyStrokes(source.strokes))
  } else if (key === 'effects') {
    setSceneProp(target, key, copyEffects(source.effects))
  } else if (key === 'styleRuns') {
    setSceneProp(target, key, copyStyleRuns(source.styleRuns))
  } else if (key === 'boundVariables') {
    // Shallow copy the binding map — values are variable IDs (strings), not objects
    setSceneProp(target, key, { ...source.boundVariables })
  } else if (key === 'variableModes') {
    setSceneProp(target, key, { ...source.variableModes })
  } else if (key === 'gridPosition') {
    // Shallow copy the grid position object — all fields are primitives
    setSceneProp(target, key, source.gridPosition ? { ...source.gridPosition } : null)
  } else {
    const value = source[key]
    setSceneProp(target, key, Array.isArray(value) ? structuredClone(value) : value)
  }
}

function hasAncestorOrCycle(graph: SceneGraph, nodeId: string, targetId: string): boolean {
  let curr = graph.nodes.get(nodeId)
  const visited = new Set<string>()
  while (curr?.parentId) {
    if (visited.has(curr.parentId)) return true
    visited.add(curr.parentId)
    if (curr.parentId === targetId) return true
    curr = graph.nodes.get(curr.parentId)
  }
  return false
}

function wouldCreateCycleInClone(
  graph: SceneGraph,
  destParentId: string,
  componentId: string
): boolean {
  let curr = graph.nodes.get(destParentId)
  const visited = new Set<string>()
  while (curr) {
    if (visited.has(curr.id)) return true
    visited.add(curr.id)
    if (curr.id === componentId) return true
    if (curr.type === 'INSTANCE' && curr.componentId === componentId) return true
    if (!curr.parentId) break
    curr = graph.nodes.get(curr.parentId)
  }
  return false
}

function cloneChildrenWithMapping(
  graph: SceneGraph,
  sourceParentId: string,
  destParentId: string,
  mode: NodeCloneMode = 'deep',
  depth = 0,
  visited = new Set<string>()
): void {
  if (
    depth > 12 ||
    visited.has(sourceParentId) ||
    sourceParentId === destParentId ||
    hasAncestorOrCycle(graph, destParentId, sourceParentId)
  ) {
    return
  }
  const nextVisited = new Set(visited)
  nextVisited.add(sourceParentId)
  const sourceParent = graph.nodes.get(sourceParentId)
  if (!sourceParent) return

  for (const childId of sourceParent.childIds) {
    if (
      nextVisited.has(childId) ||
      childId === destParentId ||
      hasAncestorOrCycle(graph, destParentId, childId)
    ) {
      continue
    }
    const src = graph.nodes.get(childId)
    if (!src) continue

    if (
      src.type === 'INSTANCE' &&
      src.componentId &&
      wouldCreateCycleInClone(graph, destParentId, src.componentId)
    ) {
      continue
    }

    const cloneProps =
      src.type === 'INSTANCE'
        ? { ...cloneNodeProps(src, src.componentId, mode) }
        : cloneNodeProps(src, childId, mode)

    const clone = graph.createNode(src.type, destParentId, cloneProps)
    if (src.type === 'INSTANCE') {
      const destParent = graph.nodes.get(destParentId)
      if (destParent) {
        destParent.overrides[`${clone.id}:sourceComponentId`] = childId
      }
    }

    if (src.childIds.length > 0) {
      cloneChildrenWithMapping(graph, childId, clone.id, mode, depth + 1, nextVisited)
    }
  }
}

function bindInstanceChildProvenance(
  instChildMap: Map<string, SceneNode>,
  usedInstChildIds: Set<string>,
  overrides: Record<string, unknown>,
  compChildId: string,
  child: SceneNode
): void {
  instChildMap.set(compChildId, child)
  usedInstChildIds.add(child.id)
  if (child.type === 'INSTANCE') {
    overrides[`${child.id}:sourceComponentId`] = compChildId
  } else {
    child.componentId = compChildId
  }
}

function syncChildren(
  graph: SceneGraph,
  compParentId: string,
  instParentId: string,
  overrides: Record<string, unknown>,
  depth = 0,
  visited = new Set<string>()
): void {
  if (
    depth > 12 ||
    visited.has(instParentId) ||
    compParentId === instParentId ||
    hasAncestorOrCycle(graph, instParentId, compParentId)
  ) {
    return
  }
  visited.add(instParentId)

  const compParent = graph.nodes.get(compParentId)
  const instParent = graph.nodes.get(instParentId)
  if (!compParent || !instParent) return

  const instChildMap = new Map<string, SceneNode>()
  const usedInstChildIds = new Set<string>()

  // 1. Match direct provenance (child.componentId === compChildId or sourceComponentId === compChildId)
  for (const compChildId of compParent.childIds) {
    for (const childId of instParent.childIds) {
      if (usedInstChildIds.has(childId)) continue
      const child = graph.nodes.get(childId)
      if (!child) continue
      const sourceComponentId = overrides[`${child.id}:sourceComponentId`]
      if (
        sourceComponentId === compChildId ||
        (child.type !== 'INSTANCE' && child.componentId === compChildId)
      ) {
        instChildMap.set(compChildId, child)
        usedInstChildIds.add(childId)
        break
      }
    }
  }

  // 2. Match stable Figma overrideKey
  for (const compChildId of compParent.childIds) {
    if (instChildMap.has(compChildId)) continue
    const compChild = graph.nodes.get(compChildId)
    if (!compChild?.overrideKey) continue

    for (const childId of instParent.childIds) {
      if (usedInstChildIds.has(childId)) continue
      const child = graph.nodes.get(childId)
      if (child?.overrideKey && child.overrideKey === compChild.overrideKey) {
        bindInstanceChildProvenance(instChildMap, usedInstChildIds, overrides, compChildId, child)
        break
      }
    }
  }

  // 3. Positional / structural matching for remaining unmapped children
  for (let i = 0; i < compParent.childIds.length; i++) {
    const compChildId = compParent.childIds[i]
    if (instChildMap.has(compChildId)) continue
    const compChild = graph.nodes.get(compChildId)
    if (!compChild) continue

    if (i < instParent.childIds.length) {
      const candidate = graph.nodes.get(instParent.childIds[i])
      if (candidate && !usedInstChildIds.has(candidate.id) && candidate.type === compChild.type) {
        bindInstanceChildProvenance(
          instChildMap,
          usedInstChildIds,
          overrides,
          compChildId,
          candidate
        )
        continue
      }
    }

    for (const childId of instParent.childIds) {
      if (usedInstChildIds.has(childId)) continue
      const child = graph.nodes.get(childId)
      if (child && child.type === compChild.type && child.name === compChild.name) {
        bindInstanceChildProvenance(instChildMap, usedInstChildIds, overrides, compChildId, child)
        break
      }
    }
  }

  // 4. Clone truly new children from compParent
  for (const compChildId of compParent.childIds) {
    if (!instChildMap.has(compChildId)) {
      const src = graph.nodes.get(compChildId)
      if (!src) continue
      const cloneProps =
        src.type === 'INSTANCE'
          ? { ...cloneNodeProps(src, src.componentId) }
          : cloneNodeProps(src, compChildId)
      const clone = graph.createNode(src.type, instParentId, cloneProps)
      if (src.type === 'INSTANCE') {
        overrides[`${clone.id}:sourceComponentId`] = compChildId
      }
      if (src.childIds.length > 0) {
        cloneChildrenWithMapping(graph, compChildId, clone.id, 'deep', depth + 1, visited)
      }
      instChildMap.set(compChildId, clone)
      usedInstChildIds.add(clone.id)
    }
  }

  // 5. Sync props and recurse into children
  for (const compChildId of compParent.childIds) {
    const compChild = graph.nodes.get(compChildId)
    const instChild = instChildMap.get(compChildId)
    if (!compChild || !instChild) continue

    for (const key of INSTANCE_SYNC_PROPS) {
      const overrideKey = `${instChild.id}:${key}`
      if (overrideKey in overrides) continue
      copyProp(instChild, compChild, key)
    }

    for (const key of INSTANCE_CHILD_TEXT_SYNC_PROPS) {
      const overrideKey = `${instChild.id}:${key}`
      if (overrideKey in overrides) continue
      copyProp(instChild, compChild, key)
    }

    if (compChild.childIds.length > 0 && !(`${instChild.id}:componentId` in overrides)) {
      syncChildren(graph, compChildId, instChild.id, overrides, depth + 1, visited)
    }
  }

  // 6. Sort instance children to match component child order
  const compChildOrder = compParent.childIds
  instParent.childIds.sort((a, b) => {
    const nodeA = graph.nodes.get(a)
    const nodeB = graph.nodes.get(b)
    const sourceA = nodeA ? overrides[`${nodeA.id}:sourceComponentId`] : undefined
    const sourceB = nodeB ? overrides[`${nodeB.id}:sourceComponentId`] : undefined
    const mappedA = typeof sourceA === 'string' ? sourceA : nodeA?.componentId
    const mappedB = typeof sourceB === 'string' ? sourceB : nodeB?.componentId
    const idxA = mappedA ? compChildOrder.indexOf(mappedA) : -1
    const idxB = mappedB ? compChildOrder.indexOf(mappedB) : -1
    return idxA - idxB
  })
}

export function copyInstanceComponentProps(component: SceneNode): Partial<SceneNode> {
  const props: Partial<SceneNode> = {}
  for (const key of INSTANCE_SYNC_PROPS) copyProp(props, component, key)
  return props
}

export function createInstance(
  graph: SceneGraph,
  componentId: string,
  parentId: string,
  overrides: Partial<SceneNode> = {}
): SceneNode | null {
  const component = graph.nodes.get(componentId)
  if (component?.type !== 'COMPONENT') return null

  const props: Partial<SceneNode> = {
    ...copyInstanceComponentProps(component),
    name: component.name,
    componentId
  }

  const instance = graph.createNode('INSTANCE', parentId, { ...props, ...overrides })

  cloneChildrenWithMapping(graph, component.id, instance.id)

  return instance
}

export function populateInstanceChildren(
  graph: SceneGraph,
  instanceId: string,
  componentId: string,
  mode: NodeCloneMode = 'deep'
): void {
  const instance = graph.nodes.get(instanceId)
  const component = graph.nodes.get(componentId)
  if (!instance || !component || instance.type !== 'INSTANCE') return
  cloneChildrenWithMapping(graph, componentId, instanceId, mode)
}

export function swapInstanceComponent(
  graph: SceneGraph,
  instanceId: string,
  componentId: string
): void {
  const instance = graph.nodes.get(instanceId)
  const component = graph.nodes.get(componentId)
  if (!instance || component?.type !== 'COMPONENT' || instance.type !== 'INSTANCE') return

  const previousComponent = instance.componentId ? graph.nodes.get(instance.componentId) : undefined
  const updates: Partial<SceneNode> = { componentId }
  for (const key of INSTANCE_SYNC_PROPS) {
    if (key in instance.overrides) continue
    copyProp(updates, component, key)
  }
  if (!previousComponent || instance.name === previousComponent.name) updates.name = component.name

  const childIds = Array.from(instance.childIds)
  for (const childId of childIds) graph.deleteNode(childId)
  graph.updateNode(instanceId, updates)
  cloneChildrenWithMapping(graph, componentId, instanceId)
}

export function syncInstances(graph: SceneGraph, componentId: string): void {
  const component = graph.nodes.get(componentId)
  if (component?.type !== 'COMPONENT') return

  for (const instance of getInstances(graph, componentId)) {
    for (const key of INSTANCE_SYNC_PROPS) {
      if (key in instance.overrides) continue
      copyProp(instance, component, key)
    }

    syncChildren(graph, component.id, instance.id, instance.overrides)
  }
}

export function detachInstance(graph: SceneGraph, instanceId: string): void {
  const node = graph.nodes.get(instanceId)
  if (node?.type !== 'INSTANCE') return
  if (node.componentId) {
    graph.instanceIndex.get(node.componentId)?.delete(instanceId)
  }
  node.type = 'FRAME'
  node.componentId = null
  node.overrides = {}
}

export function getMainComponent(graph: SceneGraph, instanceId: string): SceneNode | undefined {
  const node = graph.nodes.get(instanceId)
  if (!node?.componentId) return undefined
  return graph.nodes.get(node.componentId)
}

export function getInstances(graph: SceneGraph, componentId: string): SceneNode[] {
  const ids = graph.instanceIndex.get(componentId)
  if (!ids) return []
  const instances: SceneNode[] = []
  for (const id of ids) {
    const node = graph.nodes.get(id)
    if (node) instances.push(node)
  }
  return instances
}
