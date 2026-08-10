import { useRef, useCallback } from 'react'

import type { Editor } from '@openweave/core/editor'
import type { Effect, Fill, SceneNode, Stroke } from '@openweave/scene-graph'

import { useSceneComputed } from '#react/internal/scene-computed/use'

export const MIXED = Symbol('mixed')
export type MixedValue<T> = T | typeof MIXED | symbol

export type ArrayItem = Fill | Stroke | Effect | Record<string, unknown>

export function areArrayItemsEqual(a: ArrayItem, b: ArrayItem): boolean {
  if (a === b) return true
  const aKeys = Object.keys(a)
  const bKeys = Object.keys(b)
  if (aKeys.length !== bKeys.length) return false
  for (const key of aKeys) {
    const aValue = a[key as keyof typeof a]
    const bValue = b[key as keyof typeof b]
    if (Array.isArray(aValue) && Array.isArray(bValue)) {
      if (aValue.length !== bValue.length) return false
      for (let i = 0; i < aValue.length; i++) {
        const left = aValue[i]
        const right = bValue[i]
        if (
          typeof left === 'object' &&
          left != null &&
          typeof right === 'object' &&
          right != null
        ) {
          if (!areArrayItemsEqual(left as ArrayItem, right as ArrayItem)) return false
        } else if (left !== right) {
          return false
        }
      }
      continue
    }
    if (
      typeof aValue === 'object' &&
      aValue != null &&
      typeof bValue === 'object' &&
      bValue != null
    ) {
      if (!areArrayItemsEqual(aValue as ArrayItem, bValue as ArrayItem)) return false
      continue
    }
    if (aValue !== bValue) return false
  }
  return true
}

type ArrayPropKey = 'fills' | 'strokes' | 'effects'

export function useNodePropSelectionState(store: Editor) {
  const node = useSceneComputed(() => {
    void store.state.sceneVersion
    return store.getSelectedNode() ?? null
  })
  const nodes = useSceneComputed(() => {
    void store.state.sceneVersion
    return store.getSelectedNodes()
  })
  const isMulti = nodes.length > 1
  const active = node !== null || isMulti
  const activeNode = node ?? (nodes[0] as SceneNode | undefined) ?? null

  const merged = useCallback(<K extends keyof SceneNode>(key: K): MixedValue<SceneNode[K]> => {
    const all = nodes
    if (all.length === 0) return MIXED
    const first = all[0][key]
    for (let i = 1; i < all.length; i++) {
      if (all[i][key] !== first) return MIXED
    }
    return first
  }, [nodes])

  const prop = useCallback(<K extends keyof SceneNode>(key: K) => {
    return merged(key)
  }, [merged])

  const updateAllWithUndo = useCallback((patch: Partial<SceneNode>, label: string) => {
    for (const n of nodes) {
      store.updateNodeWithUndo(n.id, patch, label)
    }
  }, [nodes, store])

  return { node, nodes, isMulti, active, activeNode, merged, prop, updateAllWithUndo }
}

export function isNodeArrayMixed(nodes: SceneNode[], key: keyof SceneNode): boolean {
  if (nodes.length <= 1) return false
  const first = nodes[0][key]
  if (!Array.isArray(first)) return nodes.some((n) => n[key] !== first)
  for (let i = 1; i < nodes.length; i++) {
    const current = nodes[i][key]
    if (!Array.isArray(current) || current.length !== first.length) return true
    for (let j = 0; j < first.length; j++) {
      const left = first[j]
      const right = current[j]
      if (typeof left === 'object' && typeof right === 'object') {
        if (!areArrayItemsEqual(left as ArrayItem, right as ArrayItem)) return true
      } else if (left !== right) {
        return true
      }
    }
  }
  return false
}

export function useNodePropArrayActions({
  store,
  nodes,
  activeNode,
  isMulti
}: {
  store: Editor
  nodes: SceneNode[]
  activeNode: SceneNode | null
  isMulti: boolean
}) {
  const targetNodes = useCallback((): SceneNode[] => {
    if (isMulti) return nodes
    return activeNode ? [activeNode] : []
  }, [isMulti, nodes, activeNode])

  const updateArrayItem = useCallback((
    key: ArrayPropKey,
    index: number,
    patch: Record<string, unknown> | Fill | Stroke,
    label: string
  ) => {
    for (const n of targetNodes()) {
      const arr = [...(n[key] as ArrayItem[])]
      arr[index] = { ...arr[index], ...patch } as (typeof arr)[number]
      store.updateNodeWithUndo(n.id, { [key]: arr } as Partial<SceneNode>, label)
    }
  }, [store, targetNodes])

  const removeArrayItem = useCallback((key: ArrayPropKey, index: number, label: string) => {
    for (const n of targetNodes()) {
      store.updateNodeWithUndo(
        n.id,
        { [key]: (n[key] as unknown[]).filter((_, i) => i !== index) } as Partial<SceneNode>,
        label
      )
    }
  }, [store, targetNodes])

  const toggleArrayVisibility = useCallback((key: ArrayPropKey, index: number) => {
    for (const n of targetNodes()) {
      const items = n[key] as Array<{ visible: boolean }>
      if (!items[index]) continue
      const arr = [...(n[key] as ArrayItem[])]
      arr[index] = { ...arr[index], visible: !items[index].visible }
      store.updateNodeWithUndo(
        n.id,
        { [key]: arr } as Partial<SceneNode>,
        `Toggle ${key} visibility`
      )
    }
  }, [store, targetNodes])

  return { targetNodes, updateArrayItem, removeArrayItem, toggleArrayVisibility }
}

export function useNodePropScrubActions(store: Editor) {
  const previousValuesRef = useRef(new Map<string, Record<string, number | string>>())

  const storePreviousValues = useCallback((key: string) => {
    for (const n of store.getSelectedNodes()) {
      let rec = previousValuesRef.current.get(n.id)
      if (!rec) {
        rec = {}
        previousValuesRef.current.set(n.id, rec)
      }
      if (!(key in rec)) {
        rec[key] = n[key as keyof SceneNode] as number | string
      }
    }
  }, [store])

  const updateProp = useCallback((key: string, value: number | string) => {
    if (store.getSelectedNodes().length > 1) {
      storePreviousValues(key)
      for (const n of store.getSelectedNodes()) {
        store.updateNode(n.id, { [key]: value })
      }
    } else {
      const node = store.getSelectedNode()
      if (node) store.updateNode(node.id, { [key]: value })
    }
  }, [store, storePreviousValues])

  const commitProp = useCallback((key: string, _value: number | string, previous: number | string) => {
    if (store.getSelectedNodes().length > 1) {
      for (const n of store.getSelectedNodes()) {
        const prev = previousValuesRef.current.get(n.id)?.[key] ?? previous
        store.commitNodeUpdate(n.id, { [key]: prev } as Partial<SceneNode>, `Change ${key}`)
      }
      previousValuesRef.current.clear()
    } else {
      const node = store.getSelectedNode()
      if (node) {
        store.commitNodeUpdate(node.id, { [key]: previous } as Partial<SceneNode>, `Change ${key}`)
      }
    }
  }, [store])

  return { updateProp, commitProp }
}
