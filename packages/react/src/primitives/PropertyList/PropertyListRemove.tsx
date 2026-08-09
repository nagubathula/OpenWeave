import React, { type ElementType, type ReactNode } from 'react'
import { Slot } from '@radix-ui/react-slot'

import { usePropertyListPart } from './context'
import type { PropertyListKey, PropertyListPartProps } from './types'

export interface PropertyListRemoveProps<K extends PropertyListKey> extends PropertyListPartProps<K> {
  index: number
  onRemove?: (index: number) => void
  children?: ReactNode
}

export function PropertyListRemove<K extends PropertyListKey>({
  propKey,
  index,
  as: Component = 'button',
  asChild = false,
  disabled: disabledProp = false,
  onRemove,
  children,
  ...props
}: PropertyListRemoveProps<K> & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children'>) {
  const context = usePropertyListPart(propKey)
  const disabled = disabledProp || context.disabled

  const remove = () => {
    if (disabled) return
    onRemove?.(index)
    context.actions.remove(index)
  }

  const Comp = asChild ? Slot : Component

  return (
    <Comp
      type={!asChild && Component === 'button' ? 'button' : undefined}
      disabled={disabled}
      data-slot="remove"
      onClick={(e: React.MouseEvent) => {
        remove()
        props.onClick?.(e as any)
      }}
      {...(props as any)}
    >
      {children}
    </Comp>
  )
}

export default PropertyListRemove
