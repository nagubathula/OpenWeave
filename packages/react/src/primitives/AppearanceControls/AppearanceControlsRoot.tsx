import React from 'react'
import { useAppearance } from '#react/controls/appearance/use'
import type { AppearanceControlsRootSlotProps } from './types'

export interface AppearanceControlsRootProps {
  children?: React.ReactNode | ((props: AppearanceControlsRootSlotProps) => React.ReactNode)
}

export function AppearanceControlsRoot({
  children
}: AppearanceControlsRootProps) {
  const ctx = useAppearance()

  const actions = {
    updateProp: ctx.updateProp,
    commitProp: ctx.commitProp,
    setBlendMode: ctx.setBlendMode,
    toggleVisibility: ctx.toggleVisibility,
    toggleIndependentCorners: ctx.toggleIndependentCorners,
    updateCornerProp: ctx.updateCornerProp,
    commitCornerProp: ctx.commitCornerProp
  }

  const renderedChildren = typeof children === 'function' ? children({
    node: ctx.node,
    isMulti: ctx.isMulti,
    active: ctx.active,
    hasCornerRadius: ctx.hasCornerRadius,
    independentCorners: ctx.independentCorners,
    showIndependentCorners: ctx.showIndependentCorners,
    cornerRadiusValue: ctx.cornerRadiusValue,
    cornerSmoothingPercent: ctx.cornerSmoothingPercent,
    opacityPercent: ctx.opacityPercent,
    blendModeValue: ctx.blendModeValue,
    visibilityState: ctx.visibilityState,
    actions
  }) : children

  return <>{renderedChildren}</>
}

export default AppearanceControlsRoot
