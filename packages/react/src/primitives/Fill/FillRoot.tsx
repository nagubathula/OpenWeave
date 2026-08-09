import React from 'react'
import type { Fill } from '@openweave/scene-graph'
import { useFill } from './useFill'
import type { FillRootSlotProps } from './types'

export interface FillRootProps {
  fill: Fill
  onUpdate: (fill: Fill) => void
  children?: React.ReactNode | ((props: FillRootSlotProps) => React.ReactNode)
}

export function FillRoot({ fill, onUpdate, children }: FillRootProps) {
  const { category, swatchBackground, transparent, actions } = useFill(fill, onUpdate)

  const renderedChildren = typeof children === 'function' ? children({
    fill,
    category,
    swatchBackground,
    transparent,
    actions
  }) : children

  return <>{renderedChildren}</>
}

export default FillRoot
