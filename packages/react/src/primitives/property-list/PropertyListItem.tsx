import { Slot } from '@radix-ui/react-slot'
import React, { useMemo, type ElementType } from 'react'

import { usePropertyListPart } from './context'
import type {
  PropertyListItemActions,
  PropertyListItemFor,
  PropertyListItemSlotProps,
  PropertyListKey,
  PropertyListPatchFor
} from './types'

export interface PropertyListItemProps<K extends PropertyListKey> {
  propKey: K
  index: number
  dragging?: boolean
  disabled?: boolean
  as?: ElementType
  asChild?: boolean

  onUpdate?: (index: number, item: PropertyListItemFor<K>) => void
  onPatch?: (index: number, changes: PropertyListPatchFor<K>) => void
  onRemove?: (index: number) => void
  onToggleVisibility?: (index: number) => void

  children?: React.ReactNode | ((props: PropertyListItemSlotProps<K>) => React.ReactNode)
}

export function PropertyListItem<K extends PropertyListKey>({
  propKey,
  index,
  dragging = false,
  disabled: disabledProp = false,
  as: Component = 'div',
  asChild = false,
  onUpdate,
  onPatch,
  onRemove,
  onToggleVisibility,
  children,
  ...props
}: PropertyListItemProps<K> & Omit<React.HTMLAttributes<HTMLElement>, 'children' | 'onUpdate'>) {
  const context = usePropertyListPart(propKey)

  const item = context.items[index] as PropertyListItemFor<K> | undefined
  const hidden = item?.visible === false
  const disabled = disabledProp || context.disabled

  const actions = useMemo<PropertyListItemActions<K>>(
    () => ({
      update: (nextItem) => {
        if (disabled) return
        onUpdate?.(index, nextItem)
        context.actions.update(index, nextItem)
      },
      patch: (changes) => {
        if (disabled) return
        onPatch?.(index, changes)
        context.actions.patch(index, changes)
      },
      remove: () => {
        if (disabled) return
        onRemove?.(index)
        context.actions.remove(index)
      },
      toggleVisibility: () => {
        if (disabled) return
        onToggleVisibility?.(index)
        context.actions.toggleVisibility(index)
      }
    }),
    [disabled, index, onUpdate, onPatch, onRemove, onToggleVisibility, context.actions]
  )

  const slotProps = useMemo<PropertyListItemSlotProps<K>>(
    () => ({
      item,
      index,
      hidden,
      dragging,
      disabled,
      actions
    }),
    [item, index, hidden, dragging, disabled, actions]
  )

  const Comp = asChild ? Slot : Component
  const renderedChildren = typeof children === 'function' ? children(slotProps) : children

  return (
    <Comp
      data-hidden={hidden ? '' : undefined}
      data-dragging={dragging ? '' : undefined}
      data-disabled={disabled ? '' : undefined}
      data-slot="item"
      {...props}
    >
      {renderedChildren}
    </Comp>
  )
}

export default PropertyListItem
