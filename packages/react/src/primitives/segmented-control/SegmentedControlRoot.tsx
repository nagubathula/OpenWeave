import React, { useMemo, useCallback } from 'react'
import * as ToggleGroup from '@radix-ui/react-toggle-group'
import * as RovingFocus from '@radix-ui/react-roving-focus'

import { SegmentedControlProvider } from './context'
import type { SegmentedControlRootProps, SegmentedControlContext } from './types'

export function SegmentedControlRoot({
  mode = 'single',
  modelValue,
  onModelValueChange,
  onAction,
  orientation = 'horizontal',
  disabled = false,
  required = false,
  rovingFocus = true,
  loop = true,
  children,
  dir,
  ...props
}: SegmentedControlRootProps & Omit<React.HTMLAttributes<HTMLDivElement>, 'children' | 'defaultValue'>) {
  const selected = useCallback(
    (value: string): boolean => {
      if (Array.isArray(modelValue)) return modelValue.includes(value)
      return modelValue === value
    },
    [modelValue]
  )

  const activate = useCallback(
    (value: string) => {
      if (!disabled) onAction?.(value)
    },
    [disabled, onAction]
  )

  const updateSingle = useCallback(
    (value: string) => {
      if (required && !value) return
      onModelValueChange?.(value || undefined)
    },
    [required, onModelValueChange]
  )

  const updateMultiple = useCallback(
    (value: string[]) => {
      if (!Array.isArray(value)) return
      onModelValueChange?.(value)
    },
    [onModelValueChange]
  )

  const contextValue = useMemo<SegmentedControlContext>(
    () => ({
      mode,
      modelValue,
      disabled,
      selected,
      activate
    }),
    [mode, modelValue, disabled, selected, activate]
  )

  const renderedChildren = typeof children === 'function' ? children({ mode, modelValue }) : children
  const direction = (dir === 'ltr' || dir === 'rtl' ? dir : undefined) as 'ltr' | 'rtl' | undefined

  if (mode === 'single') {
    return (
      <SegmentedControlProvider value={contextValue}>
        <ToggleGroup.Root
          type="single"
          value={(typeof modelValue === 'string' ? modelValue : undefined) || ''}
          onValueChange={updateSingle}
          orientation={orientation}
          disabled={disabled}
          rovingFocus={rovingFocus}
          loop={loop}
          dir={direction}
          data-slot="root"
          data-mode="single"
          {...props}
        >
          {renderedChildren}
        </ToggleGroup.Root>
      </SegmentedControlProvider>
    )
  }

  if (mode === 'multiple') {
    return (
      <SegmentedControlProvider value={contextValue}>
        <ToggleGroup.Root
          type="multiple"
          value={Array.isArray(modelValue) ? modelValue : []}
          onValueChange={updateMultiple}
          orientation={orientation}
          disabled={disabled}
          rovingFocus={rovingFocus}
          loop={loop}
          dir={direction}
          data-slot="root"
          data-mode="multiple"
          {...props}
        >
          {renderedChildren}
        </ToggleGroup.Root>
      </SegmentedControlProvider>
    )
  }

  return (
    <SegmentedControlProvider value={contextValue}>
      <RovingFocus.Root
        orientation={orientation}
        loop={loop}
        dir={direction}
        data-slot="root"
        data-mode="action"
        {...(props as any)}
      >
        <div role="group" style={{ display: 'contents' }}>
          {renderedChildren}
        </div>
      </RovingFocus.Root>
    </SegmentedControlProvider>
  )
}

export default SegmentedControlRoot
