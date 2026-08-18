import { Slot } from '@radix-ui/react-slot'
import React, { type ReactNode } from 'react'

import { usePropertyListPart } from './context'
import type { PropertyListKey, PropertyListPartProps } from './types'

export interface PropertyListVisibilityProps<
  K extends PropertyListKey
> extends PropertyListPartProps<K> {
  index: number
  onToggleVisibility?: (index: number) => void
  children?: ReactNode
}

export function PropertyListVisibility<K extends PropertyListKey>({
  propKey,
  index,
  as: Component = 'button',
  asChild = false,
  disabled: disabledProp = false,
  onToggleVisibility,
  children,
  ...props
}: PropertyListVisibilityProps<K> &
  Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children'>) {
  const context = usePropertyListPart(propKey)
  const disabled = disabledProp || context.disabled

  const toggleVisibility = () => {
    if (disabled) return
    onToggleVisibility?.(index)
    context.actions.toggleVisibility(index)
  }

  const Comp = asChild ? Slot : Component

  return (
    <Comp
      type={!asChild && Component === 'button' ? 'button' : undefined}
      disabled={disabled}
      data-slot="visibility"
      onClick={(e: React.MouseEvent) => {
        toggleVisibility()
        props.onClick?.(e as any)
      }}
      {...(props as any)}
    >
      {children}
    </Comp>
  )
}

export default PropertyListVisibility
