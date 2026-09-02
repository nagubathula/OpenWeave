import {
  INSTANCE_CHILD_TEXT_SYNC_PROPS,
  INSTANCE_SYNC_PROPS,
  type SceneGraph,
  type SceneNode
} from '@openweave/scene-graph'

/**
 * Records instance overrides for user edits so main→instance sync stops
 * stomping them. Sync (instances.ts) skips a prop when the enclosing instance
 * carries an override key: bare `${prop}` for the instance root's own synced
 * props, `${nodeId}:${prop}` for props of any node in the instance subtree.
 *
 * This planner runs only on user-intent mutation paths (editor updateNode /
 * updateNodeWithUndo, text commit) — never on graph-level writes, which are
 * shared with auto-layout and sync itself.
 */

const ROOT_SYNCED = new Set<string>(INSTANCE_SYNC_PROPS)
const CHILD_SYNCED = new Set<string>([...INSTANCE_SYNC_PROPS, ...INSTANCE_CHILD_TEXT_SYNC_PROPS])

export type OverrideRecording = {
  instanceId: string
  /** Keys newly added to the instance's overrides map (absent before the edit). */
  added: Record<string, unknown>
}

/**
 * Plans the override keys an edit to `nodeId` should record. Call BEFORE (or
 * right after) applying the edit but in the same task, so it sees the
 * pre-recording overrides maps.
 */
export function planInstanceOverrideRecording(
  graph: SceneGraph,
  nodeId: string,
  changes: Partial<SceneNode>
): OverrideRecording[] {
  const node = graph.getNode(nodeId)
  if (!node) return []
  const changedKeys = Object.keys(changes)
  const recordings: OverrideRecording[] = []

  // The instance's own synced props are shielded by bare keys on itself.
  if (node.type === 'INSTANCE' && node.componentId) {
    const added: Record<string, unknown> = {}
    for (const key of changedKeys) {
      if (ROOT_SYNCED.has(key) && !(key in node.overrides)) {
        added[key] = changes[key as keyof SceneNode]
      }
    }
    if (Object.keys(added).length > 0) recordings.push({ instanceId: node.id, added })
  }

  // Child edits are shielded by `${nodeId}:${prop}` keys on EVERY enclosing
  // instance — outer instances sync recursively through nested subtrees with
  // their own overrides map.
  let current = node.parentId ? graph.getNode(node.parentId) : undefined
  while (current) {
    if (current.type === 'INSTANCE' && current.componentId) {
      const added: Record<string, unknown> = {}
      for (const key of changedKeys) {
        const overrideKey = `${nodeId}:${key}`
        if (CHILD_SYNCED.has(key) && !(overrideKey in current.overrides)) {
          added[overrideKey] = changes[key as keyof SceneNode]
        }
      }
      if (Object.keys(added).length > 0) recordings.push({ instanceId: current.id, added })
    }
    current = current.parentId ? graph.getNode(current.parentId) : undefined
  }

  return recordings
}

/** Adds the planned override keys to their instances' overrides maps. */
export function applyOverrideRecordings(graph: SceneGraph, recordings: OverrideRecording[]): void {
  for (const recording of recordings) {
    const instance = graph.getNode(recording.instanceId)
    if (instance?.type !== 'INSTANCE') continue
    graph.updateNode(recording.instanceId, {
      overrides: { ...instance.overrides, ...recording.added }
    })
  }
}

/** Removes the planned override keys again — the inverse for undo entries. */
export function removeOverrideRecordings(graph: SceneGraph, recordings: OverrideRecording[]): void {
  for (const recording of recordings) {
    const instance = graph.getNode(recording.instanceId)
    if (instance?.type !== 'INSTANCE') continue
    const removed = new Set(Object.keys(recording.added))
    const overrides = Object.fromEntries(
      Object.entries(instance.overrides).filter(([key]) => !removed.has(key))
    )
    graph.updateNode(recording.instanceId, { overrides })
  }
}

/** Plans, applies, and returns the recordings for a just-applied user edit. */
export function recordInstanceOverrides(
  graph: SceneGraph,
  nodeId: string,
  changes: Partial<SceneNode>
): OverrideRecording[] {
  const recordings = planInstanceOverrideRecording(graph, nodeId, changes)
  applyOverrideRecordings(graph, recordings)
  return recordings
}
