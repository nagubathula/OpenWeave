import { useEffect, useRef } from 'react'

import { useEditor } from '@openweave/react'

import type { Color } from '@openweave/scene-graph/primitives'
import type { BindableValueSlotProps, BindingTarget } from '@openweave/react'

export type PaintBindingKind = 'fills' | 'strokes'

export function paintBindingTargets(
  nodeIds: string[],
  kind: PaintBindingKind,
  index: number
): BindingTarget[] {
  return nodeIds.map((nodeId) => ({ nodeId, path: `${kind}/${index}/color` }))
}

type PaintBinding = Pick<BindableValueSlotProps<Color>, 'state' | 'actions'>

/**
 * Coalesces a color-editing session (e.g. dragging inside a color popover)
 * into a single undo batch, detaching any bound variable on the first edit
 * (detach-on-edit policy). Mirrors the old BindableValue mutation lifecycle:
 * `apply` opens the batch lazily, `commit` closes it (call on popover close),
 * and an unfinished session is rolled back on unmount.
 */
export function usePaintMutation() {
  const editor = useEditor()
  const activeRef = useRef(false)

  useEffect(() => {
    return () => {
      if (!activeRef.current) return
      activeRef.current = false
      editor.undo.rollbackBatch()
    }
  }, [editor])

  function apply(binding: PaintBinding, flush: () => void, label: string, update: () => void) {
    if (!activeRef.current) {
      flush()
      editor.undo.beginBatch(label)
      activeRef.current = true
      // Detach-on-edit: editing a bound (or inconsistently bound) color hands
      // control back to the layer value. The unbind is recorded inside the
      // open batch so undo restores the binding.
      if (binding.state !== 'unbound') binding.actions.unbind()
    }
    update()
  }

  function commit() {
    if (!activeRef.current) return
    activeRef.current = false
    editor.undo.commitBatch()
  }

  function rollback() {
    if (!activeRef.current) return
    activeRef.current = false
    editor.undo.rollbackBatch()
  }

  /** Discrete edit: begin, apply, and commit in one step (e.g. hex entry). */
  function applyAndCommit(
    binding: PaintBinding,
    flush: () => void,
    label: string,
    update: () => void
  ) {
    apply(binding, flush, label, update)
    commit()
  }

  return { apply, commit, rollback, applyAndCommit }
}
