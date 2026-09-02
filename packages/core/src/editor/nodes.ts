import { pick } from 'es-toolkit/object'

import { styleDetachmentChanges, type SceneNode } from '@openweave/scene-graph'

import {
  applyOverrideRecordings,
  recordInstanceOverrides,
  removeOverrideRecordings
} from './components/override-recording'
import { createLayoutModeActions } from './layout-mode'
import { createNudgeActions } from './nudge'
import { textAutoResizeChanges } from './text/auto-resize'
import type { EditorContext } from './types'
import { createVariableBindingActions } from './variable-bindings'

export function opacityFromBuffer(buffer: string): number {
  if (buffer === '0') return 1
  if (!/^\d+$/.test(buffer)) return 1
  const n = Number.parseInt(buffer, 10)
  if (!Number.isFinite(n)) return 1
  const percent = buffer.length === 1 ? n * 10 : n
  return Math.min(100, Math.max(0, percent)) / 100
}

export function createNodeActions(ctx: EditorContext) {
  const layoutModeActions = createLayoutModeActions(ctx)
  const nudgeActions = createNudgeActions(ctx)
  const variableBindingActions = createVariableBindingActions(ctx)

  function updateNode(id: string, changes: Partial<SceneNode>) {
    const node = ctx.graph.getNode(id)
    if (!node) return
    const nextChanges = styleDetachmentChanges(node, {
      ...changes,
      ...textAutoResizeChanges(node, changes)
    })
    ctx.graph.updateNode(id, nextChanges)
    recordInstanceOverrides(ctx.graph, id, nextChanges)
    ctx.runLayoutForNode(id)
  }

  function updateNodeWithUndo(id: string, changes: Partial<SceneNode>, label = 'Update') {
    const node = ctx.graph.getNode(id)
    if (!node) return
    const nextChanges = styleDetachmentChanges(node, {
      ...changes,
      ...textAutoResizeChanges(node, changes)
    })
    const previous = pick(
      node,
      Object.keys(nextChanges) as (keyof SceneNode)[]
    ) as Partial<SceneNode>
    ctx.graph.updateNode(id, nextChanges)
    // Edits inside an instance become overrides so main→instance sync keeps
    // them; undoing the edit lifts the overrides again.
    const overrideRecordings = recordInstanceOverrides(ctx.graph, id, nextChanges)
    ctx.runLayoutForNode(id)
    ctx.undo.push({
      label,
      forward: () => {
        ctx.graph.updateNode(id, nextChanges)
        applyOverrideRecordings(ctx.graph, overrideRecordings)
        ctx.runLayoutForNode(id)
      },
      inverse: () => {
        ctx.graph.updateNode(id, previous)
        removeOverrideRecordings(ctx.graph, overrideRecordings)
        ctx.runLayoutForNode(id)
      }
    })
    ctx.requestRender()
  }

  function setOpacity(opacity: number, coalesceKey?: string) {
    if (!Number.isFinite(opacity)) return
    const clamped = Math.max(0, Math.min(1, opacity))
    const ids = [...ctx.state.selectedIds]
    if (ids.length === 0) return
    const targets = ids.map((id) => ctx.graph.getNode(id)).filter((n): n is SceneNode => n != null)
    const changed = targets.filter((t) => t.opacity !== clamped)
    if (changed.length === 0) return
    ctx.undo.runBatch(
      'Set opacity',
      () => {
        for (const target of changed) {
          updateNodeWithUndo(target.id, { opacity: clamped }, 'Set opacity')
        }
      },
      coalesceKey
    )
  }

  return {
    updateNode,
    updateNodeWithUndo,
    setOpacity,
    ...layoutModeActions,
    ...variableBindingActions,
    ...nudgeActions
  }
}
