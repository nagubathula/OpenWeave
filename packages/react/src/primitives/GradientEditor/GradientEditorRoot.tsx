import React, { type ReactNode } from 'react'
import type { Fill } from '@openweave/scene-graph'
import { useGradientStops } from './useGradientStops'

export interface GradientEditorRootProps {
  fill: Fill
  onUpdate?: (fill: Fill) => void
  children?: ReactNode | ((props: any) => ReactNode)
}

export function GradientEditorRoot({
  fill,
  onUpdate,
  children
}: GradientEditorRootProps) {
  const {
    activeStopIndex,
    stops,
    subtype,
    subtypes,
    activeColor,
    barBackground,
    setSubtype,
    selectStop,
    addStop,
    removeStop,
    updateStopPosition,
    updateStopColor,
    updateStopOpacity,
    updateActiveColor,
    dragStop
  } = useGradientStops(
    fill,
    (updated) => onUpdate?.(updated)
  )

  const actions = {
    setSubtype,
    selectStop,
    addStop,
    removeStop,
    updateStopPosition,
    updateStopColor,
    updateStopOpacity,
    updateActiveColor,
    dragStop
  }

  const renderedChildren = typeof children === 'function' ? children({
    stops,
    subtype,
    subtypes,
    activeStopIndex,
    activeColor,
    barBackground,
    actions
  }) : children

  return <>{renderedChildren}</>
}

export default GradientEditorRoot
