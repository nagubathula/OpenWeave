import { MIXED, useNodeProps } from '#react/controls/node-props/use'
import { useMemo, useCallback } from 'react'

import type { ConstraintType, SceneNode } from '@openweave/scene-graph'

import {
  isConstraintEligible,
  toggleConstraintPin,
  type ConstraintAxis,
  type ConstraintEdge,
  type ConstraintValue
} from './model'

function mergedConstraint(
  nodes: readonly SceneNode[],
  key: 'horizontalConstraint' | 'verticalConstraint'
): ConstraintValue {
  if (nodes.length === 0) return MIXED
  const first = nodes[0][key]
  return nodes.some((node) => node[key] !== first) ? MIXED : first
}

export function useConstraints() {
  const { store, nodes, isMulti } = useNodeProps()

  const active = useMemo(() => {
    return nodes.length > 0 && nodes.every((node) => isConstraintEligible(store.graph, node))
  }, [nodes, store.graph])

  const horizontal = useMemo(() => mergedConstraint(nodes, 'horizontalConstraint'), [nodes])
  const vertical = useMemo(() => mergedConstraint(nodes, 'verticalConstraint'), [nodes])

  const setAxis = useCallback(
    (axis: ConstraintAxis, value: ConstraintType) => {
      if (!active) return
      const key = axis === 'horizontal' ? 'horizontalConstraint' : 'verticalConstraint'
      const apply = () => {
        for (const node of nodes) {
          store.updateNodeWithUndo(node.id, { [key]: value }, `Change ${axis} constraint`)
        }
      }
      if (nodes.length > 1) store.undo.runBatch(`Change ${axis} constraint`, apply)
      else apply()
    },
    [active, nodes, store]
  )

  const togglePin = useCallback(
    (axis: ConstraintAxis, edge: ConstraintEdge, additive: boolean) => {
      const current = axis === 'horizontal' ? horizontal : vertical
      setAxis(axis, toggleConstraintPin(current, edge, additive))
    },
    [horizontal, vertical, setAxis]
  )

  return {
    active,
    isMulti,
    horizontal,
    vertical,
    setAxis,
    togglePin
  }
}
