import React, { useMemo, useCallback } from 'react'
import { MIXED, useNodeProps } from '#react/controls/node-props/use'
import type { SceneNode } from '@openweave/scene-graph'

export interface PositionControlsRootSlotProps {
  active: boolean
  isMulti: boolean
  ids: string[]
  xValue: number | typeof MIXED
  yValue: number | typeof MIXED
  wValue: number | typeof MIXED
  hValue: number | typeof MIXED
  rotationValue: number | typeof MIXED
  mixed: typeof MIXED
  actions: {
    updateProp: (key: keyof SceneNode, value: number) => void
    commitProp: (key: keyof SceneNode, value: number, previous: number) => void
    align: (axis: 'horizontal' | 'vertical', pos: 'min' | 'center' | 'max') => void
    flip: (axis: 'horizontal' | 'vertical') => void
    rotate: (degrees: number) => void
  }
}

export interface PositionControlsRootProps {
  children?: React.ReactNode | ((props: PositionControlsRootSlotProps) => React.ReactNode)
}

export function PositionControlsRoot({ children }: PositionControlsRootProps) {
  const {
    updateProp,
    commitProp,
    node,
    nodes,
    isMulti,
    active,
    prop: multiProp,
    store
  } = useNodeProps()

  const multiX = multiProp('x')
  const xValue = useMemo(() =>
    isMulti ? multiX : Math.round(node?.x ?? 0),
    [isMulti, multiX, node?.x]
  )
  
  const multiY = multiProp('y')
  const yValue = useMemo(() =>
    isMulti ? multiY : Math.round(node?.y ?? 0),
    [isMulti, multiY, node?.y]
  )
  
  const wValue = multiProp('width')
  const hValue = multiProp('height')
  
  const multiRotation = multiProp('rotation')
  const rotationValue = useMemo(() =>
    isMulti ? multiRotation : Math.round(node?.rotation ?? 0),
    [isMulti, multiRotation, node?.rotation]
  )
  
  const ids = useMemo(() => nodes.map((n) => n.id), [nodes])

  const align = useCallback((axis: 'horizontal' | 'vertical', pos: 'min' | 'center' | 'max') => {
    store.alignNodes(ids, axis, pos)
  }, [store, ids])

  const flip = useCallback((axis: 'horizontal' | 'vertical') => {
    store.flipNodes(ids, axis)
  }, [store, ids])

  const rotate = useCallback((degrees: number) => {
    store.rotateNodes(ids, degrees)
  }, [store, ids])

  const actions = useMemo(() => ({
    updateProp,
    commitProp,
    align,
    flip,
    rotate
  }), [updateProp, commitProp, align, flip, rotate])

  const renderedChildren = typeof children === 'function' ? children({
    active,
    isMulti,
    ids,
    xValue,
    yValue,
    wValue,
    hValue,
    rotationValue,
    mixed: MIXED,
    actions
  }) : children

  return <>{renderedChildren}</>
}

export default PositionControlsRoot
