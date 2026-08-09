import React, { type ElementType, type ReactNode } from 'react'
import { Slot } from '@radix-ui/react-slot'

import { usePropertyListPart } from './context'
import type { PropertyListItemFor, PropertyListKey, PropertyListPartProps } from './types'

export interface PropertyListAddProps<K extends PropertyListKey> extends PropertyListPartProps<K> {
  item: PropertyListItemFor<K>
  onAdd?: (item: PropertyListItemFor<K>) => void
  children?: ReactNode
}

export function PropertyListAdd<K extends PropertyListKey>({
  propKey,
  item,
  as: Component = 'button',
  asChild = false,
  disabled: disabledProp = false,
  onAdd,
  children,
  ...props
}: PropertyListAddProps<K> & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children'>) {
  const context = usePropertyListPart(propKey)
  const disabled = disabledProp || context.disabled

  const add = () => {
    if (disabled) return
    onAdd?.(item)
    context.actions.add(item)
  }

  const Comp = asChild ? Slot : Component

  return (
    <Comp
      type={!asChild && Component === 'button' ? 'button' : undefined}
      disabled={disabled}
      data-slot="add"
      onClick={(e: React.MouseEvent) => {
        add()
        props.onClick?.(e as any)
      }}
      {...(props as any)}
    >
      {children}
    </Comp>
  )
}

export default PropertyListAdd
