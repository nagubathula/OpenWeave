import React, { useMemo, useCallback } from 'react'
import { PropertyListProvider } from './context'
import type {
  PropertyListActions,
  PropertyListIdentity,
  PropertyListItemFor,
  PropertyListKey,
  PropertyListRootProps,
  PropertyListRootSlotProps
} from './types'

export function PropertyListRoot<K extends PropertyListKey>({
  propKey,
  items,
  mixed = false,
  disabled = false,
  getKey,
  onAdd,
  onRemove,
  onUpdate,
  onPatch,
  onToggleVisibility,
  onReorder,
  children
}: PropertyListRootProps<K>) {
  const keyOf = useCallback(
    (item: PropertyListItemFor<K>, index: number): PropertyListIdentity => {
      return getKey?.(item, index) ?? index
    },
    [getKey]
  )

  const actions = useMemo<PropertyListActions<K>>(
    () => ({
      add: (item) => {
        if (!disabled) onAdd?.(item)
      },
      remove: (index) => {
        if (!disabled) onRemove?.(index)
      },
      update: (index, item) => {
        if (!disabled) onUpdate?.(index, item)
      },
      patch: (index, changes) => {
        if (!disabled) onPatch?.(index, changes)
      },
      toggleVisibility: (index) => {
        if (!disabled) onToggleVisibility?.(index)
      },
      reorder: (fromIndex, toIndex) => {
        if (!disabled) onReorder?.(fromIndex, toIndex)
      }
    }),
    [disabled, onAdd, onRemove, onUpdate, onPatch, onToggleVisibility, onReorder]
  )

  const contextValue = useMemo(
    () => ({
      propKey,
      items,
      isMixed: mixed,
      disabled,
      keyOf,
      actions
    }),
    [propKey, items, mixed, disabled, keyOf, actions]
  )

  const slotProps = useMemo<PropertyListRootSlotProps<K>>(
    () => ({
      items,
      isMixed: mixed,
      disabled,
      keyOf,
      actions
    }),
    [items, mixed, disabled, keyOf, actions]
  )

  const renderedChildren = typeof children === 'function' ? children(slotProps) : children

  return (
    <PropertyListProvider value={contextValue}>
      {renderedChildren}
    </PropertyListProvider>
  )
}

export default PropertyListRoot
