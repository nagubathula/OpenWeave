import React, { useState, useCallback, useMemo } from 'react'
import * as Collapsible from '@radix-ui/react-collapsible'
import { PropertySectionProvider } from './context'
import type {
  PropertySectionActionAPI,
  PropertySectionRootProps,
  PropertySectionSlotProps,
  PropertySectionStateAttrs
} from './types'

export function PropertySectionRoot({
  open: openProp,
  defaultOpen = true,
  empty: emptyProp = false,
  disabled: disabledProp = false,
  unmountOnHide: _unmountOnHide = false,
  onOpenChange,
  asChild,
  children,
  ...props
}: PropertySectionRootProps & Omit<React.HTMLAttributes<HTMLDivElement>, 'children'>) {
  const isControlled = openProp !== undefined
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen)
  
  const open = isControlled ? openProp : uncontrolledOpen

  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      if (!isControlled) {
        setUncontrolledOpen(newOpen)
      }
      onOpenChange?.(newOpen)
    },
    [isControlled, onOpenChange]
  )

  const empty = emptyProp
  const disabled = disabledProp

  const stateAttrs = useMemo<PropertySectionStateAttrs>(
    () => ({
      'data-state': open ? 'open' : 'closed',
      ...(empty ? { 'data-empty': '' } : {}),
      ...(disabled ? { 'data-disabled': '' } : {})
    }),
    [open, empty, disabled]
  )

  const actions = useMemo<PropertySectionActionAPI>(
    () => ({
      open: () => {
        if (!disabled) handleOpenChange(true)
      },
      close: () => {
        if (!disabled) handleOpenChange(false)
      },
      toggle: () => {
        if (!disabled) handleOpenChange(!open)
      }
    }),
    [disabled, handleOpenChange, open]
  )

  const slotProps = useMemo<PropertySectionSlotProps>(
    () => ({
      open,
      empty,
      stateAttrs,
      actions
    }),
    [open, empty, stateAttrs, actions]
  )

  const contextValue = useMemo(
    () => ({
      open,
      empty,
      disabled,
      stateAttrs,
      slotProps,
      actions
    }),
    [open, empty, disabled, stateAttrs, slotProps, actions]
  )

  const renderedChildren = typeof children === 'function' ? children(slotProps) : children

  return (
    <PropertySectionProvider value={contextValue}>
      <Collapsible.Root
        asChild={asChild}
        open={open}
        disabled={disabled}
        onOpenChange={handleOpenChange}
        {...stateAttrs}
        {...props}
      >
        {renderedChildren}
      </Collapsible.Root>
    </PropertySectionProvider>
  )
}

export default PropertySectionRoot
