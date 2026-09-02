import type { SceneNode } from '@openweave/scene-graph'

import type { EditorContext } from '#core/editor/types'

type InstanceCreateSnapshot = Partial<SceneNode> & { id: string }

/** Splits an override key: bare `prop`, or `${nodeId}:${prop}` (node ids may
 * themselves contain colons — Figma guids — so split on the LAST colon). */
function parseOverrideKey(key: string, instanceId: string): { targetId: string; prop: string } {
  const splitAt = key.lastIndexOf(':')
  if (splitAt === -1) return { targetId: instanceId, prop: key }
  return { targetId: key.slice(0, splitAt), prop: key.slice(splitAt + 1) }
}

function captureProp<K extends keyof SceneNode>(
  target: Partial<SceneNode>,
  key: K,
  value: SceneNode[K]
): void {
  target[key] = value
}

function createInstanceSnapshot(instance: SceneNode): InstanceCreateSnapshot {
  const { childIds: _childIds, parentId: _parentId, type: _type, ...snapshot } = instance
  return snapshot
}

export function createComponentInstanceActions(ctx: EditorContext) {
  function createInstanceFromComponent(
    componentId: string,
    x?: number,
    y?: number,
    parentId = ctx.state.currentPageId
  ) {
    const component = ctx.graph.getNode(componentId)
    if (component?.type !== 'COMPONENT') return null

    const previousSelection = new Set(ctx.state.selectedIds)
    const instance = ctx.graph.createInstance(componentId, parentId, {
      x: x ?? component.x + component.width + 40,
      y: y ?? component.y
    })
    if (!instance) return null

    const instanceId = instance.id
    const snapshot = createInstanceSnapshot(instance)
    ctx.setSelectedIds(new Set([instanceId]))

    ctx.undo.push({
      label: 'Create instance',
      forward: () => {
        ctx.graph.createInstance(componentId, parentId, { ...snapshot })
        ctx.setSelectedIds(new Set([instanceId]))
      },
      inverse: () => {
        ctx.graph.deleteNode(instanceId)
        ctx.setSelectedIds(new Set(previousSelection))
      }
    })
    return instanceId
  }

  function detachInstance(selectedNode: SceneNode | undefined) {
    if (selectedNode?.type !== 'INSTANCE') return

    const prevComponentId = selectedNode.componentId

    ctx.graph.detachInstance(selectedNode.id)
    ctx.setSelectedIds(new Set([selectedNode.id]))

    ctx.undo.push({
      label: 'Detach instance',
      forward: () => {
        ctx.graph.detachInstance(selectedNode.id)
        ctx.requestRender()
      },
      inverse: () => {
        ctx.graph.updateNode(selectedNode.id, {
          type: 'INSTANCE',
          componentId: prevComponentId,
          overrides: {}
        })
      }
    })
  }

  /** Free-form "swap main component" from the instance header (undoable). */
  function swapInstance(selectedNode: SceneNode | undefined, componentId: string) {
    if (selectedNode?.type !== 'INSTANCE') return
    const targetComponent = ctx.graph.getNode(componentId)
    if (targetComponent?.type !== 'COMPONENT') return
    const prevComponentId = selectedNode.componentId
    if (!prevComponentId || prevComponentId === componentId) return
    const instanceId = selectedNode.id

    const swap = (toId: string) => {
      const instance = ctx.graph.getNode(instanceId)
      const component = ctx.graph.getNode(toId)
      if (instance?.type === 'INSTANCE' && component?.type === 'COMPONENT') {
        ctx.graph.swapInstanceComponent(instanceId, toId)
      }
      ctx.requestRender()
    }

    swap(componentId)
    ctx.undo.push({
      label: 'Swap instance',
      forward: () => swap(componentId),
      inverse: () => swap(prevComponentId)
    })
  }

  /**
   * "Reset all changes": drops every override and component-property
   * assignment on the instance and resyncs it from its main component.
   * Undo restores the override maps and the captured overridden values.
   */
  function resetInstanceOverrides(selectedNode: SceneNode | undefined) {
    if (selectedNode?.type !== 'INSTANCE' || !selectedNode.componentId) return
    const instanceId = selectedNode.id
    const componentId = selectedNode.componentId
    const prevOverrides = structuredClone(selectedNode.overrides)
    const prevAssignments = { ...selectedNode.componentPropertyAssignments }
    if (Object.keys(prevOverrides).length === 0 && Object.keys(prevAssignments).length === 0) {
      return
    }

    // Capture the current values behind each override so undo can restore
    // them; nested-instance swaps (sourceComponentId keys) are reverted by
    // swapping back rather than by prop writes.
    const captured = new Map<string, Partial<SceneNode>>()
    const swapBacks: Array<{ childId: string; from: string; to: string }> = []
    for (const [key, value] of Object.entries(prevOverrides)) {
      const { targetId, prop } = parseOverrideKey(key, instanceId)
      const target = ctx.graph.getNode(targetId)
      if (!target) continue
      if (prop === 'sourceComponentId') {
        if (typeof value === 'string' && target.componentId) {
          swapBacks.push({ childId: targetId, from: target.componentId, to: value })
        }
        continue
      }
      if (prop === 'componentId' || !(prop in target)) continue
      const changes = captured.get(targetId) ?? {}
      const propKey = prop as keyof SceneNode
      captureProp(changes, propKey, structuredClone(target[propKey]))
      captured.set(targetId, changes)
    }

    const swap = (childId: string, componentIdTo: string) => {
      const child = ctx.graph.getNode(childId)
      const component = ctx.graph.getNode(componentIdTo)
      if (child?.type === 'INSTANCE' && component?.type === 'COMPONENT') {
        ctx.graph.swapInstanceComponent(childId, componentIdTo)
      }
    }

    const applyReset = () => {
      if (!ctx.graph.getNode(instanceId)) return
      for (const { childId, to } of swapBacks) swap(childId, to)
      ctx.graph.updateNode(instanceId, { overrides: {}, componentPropertyAssignments: {} })
      ctx.graph.syncInstances(componentId)
      ctx.runLayoutForNode(instanceId)
      ctx.requestRender()
    }

    const applyRestore = () => {
      if (!ctx.graph.getNode(instanceId)) return
      for (const { childId, from } of swapBacks) swap(childId, from)
      ctx.graph.updateNode(instanceId, {
        overrides: structuredClone(prevOverrides),
        componentPropertyAssignments: { ...prevAssignments }
      })
      for (const [targetId, changes] of captured) {
        if (ctx.graph.getNode(targetId)) {
          ctx.graph.updateNode(targetId, structuredClone(changes))
        }
      }
      ctx.runLayoutForNode(instanceId)
      ctx.requestRender()
    }

    applyReset()
    ctx.undo.push({
      label: 'Reset all changes',
      forward: applyReset,
      inverse: applyRestore
    })
  }

  return { createInstanceFromComponent, detachInstance, resetInstanceOverrides, swapInstance }
}
