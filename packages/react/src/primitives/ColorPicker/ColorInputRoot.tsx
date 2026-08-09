import React, { type ReactNode } from 'react'
import { useColorModel } from '#react/controls/color-model/use'
import type { OkHCLControls } from '#react/controls/color-model/types'
import type { Color } from '@openweave/scene-graph/primitives'

export interface ColorInputRootProps {
  color: Color
  editable?: boolean
  okhcl?: OkHCLControls | null
  onUpdate?: (color: Color) => void
  children?: ReactNode | ((props: any) => ReactNode)
}

export function ColorInputRoot({
  color,
  editable = false,
  okhcl = null,
  onUpdate,
  children
}: ColorInputRootProps) {
  const model = useColorModel({
    color,
    okhcl,
    onUpdate
  })

  const actions = {
    updateFromHex: model.updateHex,
    updateColor: model.updateColor
  }

  const renderedChildren = typeof children === 'function' ? children({
    color,
    editable,
    hex: model.hex,
    actions,
    okhcl
  }) : children

  return <>{renderedChildren}</>
}

export default ColorInputRoot
