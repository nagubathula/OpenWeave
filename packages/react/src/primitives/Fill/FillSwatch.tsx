import React, { ElementType } from 'react'
import { Slot } from '@radix-ui/react-slot'

import { useBindingProvider } from '#react/controls/binding-provider/use'
import { useBindableValueState } from '#react/primitives/BindableValue/use'
import { useFill } from './useFill'

import type { FillSwatchProps } from './types'

export function FillSwatch({
  fill,
  label,
  as: Component = 'button',
  asChild = false,
  children,
  ...props
}: FillSwatchProps) {
  const provider = useBindingProvider()
  const { category, swatchBackground, transparent } = useFill(fill, () => {})
  
  const variableId = fill.type === 'SOLID' ? fill.boundVariables?.color?.id : undefined
  const state = useBindableValueState(variableId ? provider?.resolveVariable(variableId) : undefined)

  const Comp = asChild ? Slot : Component

  const renderedChildren = typeof children === 'function' ? children({
    fill,
    color: fill.color,
    category,
    background: swatchBackground,
    transparent,
    bindingState: state.bindingState,
    stateAttrs: state.stateAttrs
  }) : children

  return (
    <Comp
      aria-label={label ?? 'Color swatch'}
      title={label}
      {...state.stateAttrs}
      {...(props as any)}
    >
      {renderedChildren}
    </Comp>
  )
}

export default FillSwatch
