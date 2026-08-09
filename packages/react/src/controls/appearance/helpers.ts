import { useMemo, useRef, useCallback } from 'react'
import type { Editor } from '@openweave/core/editor'
import type { BlendMode, SceneNode } from '@openweave/scene-graph'

import type { CornerGeometryKey } from './types'
import { MIXED, type MixedValue } from '#react/controls/node-props/use'

const CORNER_RADIUS_TYPES = new Set([
  'RECTANGLE',
  'ROUNDED_RECTANGLE',
  'FRAME',
  'COMPONENT',
  'INSTANCE'
])

type AppearanceStateOptions = {
  node: SceneNode | null
  nodes: SceneNode[]
  isMulti: boolean
  merged: <K extends keyof SceneNode>(key: K) => MixedValue<SceneNode[K]>
}

type AppearanceActionOptions = AppearanceStateOptions & {
  editor: Editor
}

function hasUnequalCorners(node: SceneNode) {
  return !(
    node.topLeftRadius === node.topRightRadius &&
    node.topLeftRadius === node.bottomRightRadius &&
    node.topLeftRadius === node.bottomLeftRadius
  )
}

export function useAppearanceState({ node, nodes, isMulti, merged }: AppearanceStateOptions) {
  const hasCornerRadius = useMemo(() => {
    if (isMulti) return nodes.every((n) => CORNER_RADIUS_TYPES.has(n.type))
    return node ? CORNER_RADIUS_TYPES.has(node.type) : false
  }, [isMulti, nodes, node])

  const independentCorners = useMemo(() => {
    if (isMulti) return merged('independentCorners')
    return node?.independentCorners ?? false
  }, [isMulti, merged, node])

  const showIndependentCorners = useMemo(() => {
    if (isMulti) return false
    return node ? node.independentCorners || hasUnequalCorners(node) : false
  }, [isMulti, node])

  const cornerRadiusValue = useMemo(() => {
    if (isMulti) return merged('cornerRadius')
    return node?.cornerRadius ?? 0
  }, [isMulti, merged, node])

  const cornerSmoothingPercent = useMemo(() => {
    const value = merged('cornerSmoothing')
    return value === MIXED ? MIXED : Math.round(Math.max(0, Math.min(value as number, 1)) * 100)
  }, [merged])

  const opacityPercent = useMemo(() => {
    const v = merged('opacity')
    return v === MIXED ? MIXED : Math.round((v as number) * 100)
  }, [merged])

  const blendModeValue = useMemo(() => {
    const v = merged('blendMode')
    return v === MIXED ? MIXED : v
  }, [merged])

  const visibilityState = useMemo<'visible' | 'hidden' | 'mixed'>(() => {
    const v = merged('visible')
    if (v === MIXED) return 'mixed'
    return v ? 'visible' : 'hidden'
  }, [merged])

  return {
    hasCornerRadius,
    independentCorners,
    showIndependentCorners,
    cornerRadiusValue,
    cornerSmoothingPercent,
    opacityPercent,
    blendModeValue,
    visibilityState
  }
}

export function useAppearanceActions({ editor, node, nodes, isMulti }: AppearanceActionOptions) {
  const previousCornerValuesRef = useRef(new Map<CornerGeometryKey, Map<string, number>>())

  const setBlendMode = useCallback((value: BlendMode) => {
    const targets = isMulti ? [...nodes] : []
    if (!isMulti && node) targets.push(node)
    const changed = targets.filter((target) => target.blendMode !== value)
    if (changed.length === 0) return

    editor.undo.runBatch('Change blend mode', () => {
      for (const target of changed) {
        editor.updateNodeWithUndo(target.id, { blendMode: value }, 'Change blend mode')
      }
    })
  }, [isMulti, nodes, node, editor])

  const toggleVisibility = useCallback(() => {
    if (isMulti) {
      const liveNodes = nodes
        .map((n) => editor.getNode(n.id))
        .filter((n): n is SceneNode => n != null)
      if (liveNodes.length === 0) return
      const allVisible = liveNodes.every((n) => n.visible)
      editor.undo.runBatch('Toggle visibility', () => {
        for (const n of liveNodes) {
          editor.updateNodeWithUndo(n.id, { visible: !allVisible }, 'Toggle visibility')
        }
      })
      return
    }

    if (!node) return
    const liveNode = editor.getNode(node.id)
    if (!liveNode) return
    editor.updateNodeWithUndo(liveNode.id, { visible: !liveNode.visible }, 'Toggle visibility')
  }, [isMulti, nodes, node, editor])

  const toggleIndependentCorners = useCallback(() => {
    const targets = isMulti ? [...nodes] : []
    if (!isMulti && node) targets.push(node)
    if (targets.length === 0) return
    const makeIndependent = !targets.every(
      (target) => target.independentCorners || hasUnequalCorners(target)
    )

    editor.undo.runBatch(
      makeIndependent ? 'Independent corner radii' : 'Uniform corner radius',
      () => {
        for (const target of targets) {
          if (makeIndependent) {
            if (target.independentCorners) continue
            editor.updateNodeWithUndo(
              target.id,
              {
                independentCorners: true,
                topLeftRadius: target.cornerRadius,
                topRightRadius: target.cornerRadius,
                bottomRightRadius: target.cornerRadius,
                bottomLeftRadius: target.cornerRadius
              } as Partial<SceneNode>,
              'Independent corner radii'
            )
          } else {
            const uniform = target.topLeftRadius
            editor.updateNodeWithUndo(
              target.id,
              {
                independentCorners: false,
                cornerRadius: uniform,
                topLeftRadius: uniform,
                topRightRadius: uniform,
                bottomRightRadius: uniform,
                bottomLeftRadius: uniform
              } as Partial<SceneNode>,
              'Uniform corner radius'
            )
          }
        }
      }
    )
  }, [isMulti, nodes, node, editor])

  const cornerTargets = useCallback(() => {
    if (isMulti) return nodes
    return node ? [node] : []
  }, [isMulti, nodes, node])

  const updateCornerProp = useCallback((key: CornerGeometryKey, value: number) => {
    let snapshots = previousCornerValuesRef.current.get(key)
    if (!snapshots) {
      snapshots = new Map()
      previousCornerValuesRef.current.set(key, snapshots)
    }
    const normalized = key === 'cornerSmoothing' ? Math.max(0, Math.min(value, 1)) : value
    for (const target of cornerTargets()) {
      if (!snapshots.has(target.id)) snapshots.set(target.id, target[key] as number)
      editor.updateNode(target.id, { [key]: normalized })
    }
  }, [cornerTargets, editor])

  const commitCornerProp = useCallback((key: CornerGeometryKey, _value: number, previous: number) => {
    const targets = cornerTargets()
    const snapshots = previousCornerValuesRef.current.get(key)
    const commit = () => {
      for (const target of targets) {
        editor.commitNodeUpdate(
          target.id,
          { [key]: snapshots?.get(target.id) ?? previous } as Partial<SceneNode>,
          `Change ${key}`
        )
      }
    }
    if (targets.length > 1) editor.undo.runBatch(`Change ${key}`, commit)
    else commit()
    previousCornerValuesRef.current.delete(key)
  }, [cornerTargets, editor])

  return {
    setBlendMode,
    toggleVisibility,
    toggleIndependentCorners,
    updateCornerProp,
    commitCornerProp
  }
}
