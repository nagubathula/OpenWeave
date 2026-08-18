import { useEditor } from '#react/editor/context'
import { useCallback } from 'react'

import {
  MIXED,
  useNodePropArrayActions,
  useNodePropScrubActions,
  useNodePropSelectionState,
  isNodeArrayMixed
} from './helpers'

/** Sentinel value returned when a property differs across multiple selected nodes. */
export { MIXED }

/** Property value that may either be concrete or mixed across the selection. */
export type { MixedValue } from './helpers'

/**
 * Returns shared property-panel helpers for the current selection.
 *
 * This composable centralizes mixed-value detection, multi-selection updates,
 * array-item editing, and commit semantics used by higher-level controls.
 */
export function useNodeProps() {
  const store = useEditor()
  const { node, nodes, isMulti, active, activeNode, prop, merged, updateAllWithUndo } =
    useNodePropSelectionState(store)

  const isArrayMixed = useCallback(
    (key: Parameters<typeof isNodeArrayMixed>[1]): boolean => {
      return isNodeArrayMixed(nodes, key)
    },
    [nodes]
  )

  const { targetNodes, updateArrayItem, removeArrayItem, toggleArrayVisibility } =
    useNodePropArrayActions({ store, nodes, activeNode, isMulti })

  const { updateProp, commitProp } = useNodePropScrubActions(store)

  return {
    store,
    node,
    nodes,
    isMulti,
    active,
    activeNode,
    targetNodes,
    prop,
    merged,
    updateAllWithUndo,
    updateArrayItem,
    removeArrayItem,
    toggleArrayVisibility,
    isArrayMixed,
    updateProp,
    commitProp
  }
}
