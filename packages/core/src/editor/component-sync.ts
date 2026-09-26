import type { SceneGraph } from '@openweave/scene-graph'

import { computeAllLayouts } from '#core/layout'

function findEnclosingComponentId(graph: SceneGraph, nodeId: string): string | null {
  let current = graph.getNode(nodeId)
  while (current) {
    if (current.type === 'COMPONENT') return current.id
    current = current.parentId ? graph.getNode(current.parentId) : undefined
  }
  return null
}

export function createComponentSyncScheduler(
  getGraph: () => SceneGraph,
  requestRender: () => void
) {
  let pendingComponentSync: Set<string> | null = null
  let isFlushingComponentSync = false
  let syncPassCount = 0
  let resetTimer: ReturnType<typeof setTimeout> | null = null

  function resetPassCounter() {
    syncPassCount = 0
    resetTimer = null
  }

  function flushComponentSync() {
    const ids = pendingComponentSync
    if (!ids) return
    pendingComponentSync = null
    isFlushingComponentSync = true
    syncPassCount++

    if (resetTimer === null) {
      resetTimer = setTimeout(resetPassCounter, 100)
    }

    if (syncPassCount > 10) {
      isFlushingComponentSync = false
      return
    }

    try {
      const graph = getGraph()
      const componentIds = new Set<string>()
      for (const id of ids) {
        const compId = findEnclosingComponentId(graph, id)
        if (compId) componentIds.add(compId)
      }
      for (const compId of componentIds) {
        graph.syncInstances(compId)
      }
      if (componentIds.size > 0) {
        computeAllLayouts(graph)
        requestRender()
      }
    } finally {
      isFlushingComponentSync = false
    }
  }

  function scheduleComponentSync(nodeId: string) {
    if (isFlushingComponentSync) return
    const graph = getGraph()
    const compId = findEnclosingComponentId(graph, nodeId)
    if (!compId) return

    if (!pendingComponentSync) {
      pendingComponentSync = new Set()
      queueMicrotask(flushComponentSync)
    }
    pendingComponentSync.add(compId)
  }

  return { scheduleComponentSync }
}
