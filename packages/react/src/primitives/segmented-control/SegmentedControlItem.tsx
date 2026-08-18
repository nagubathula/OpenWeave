import * as RovingFocus from '@radix-ui/react-roving-focus'
import { Slot } from '@radix-ui/react-slot'
import * as ToggleGroup from '@radix-ui/react-toggle-group'
import React, { useMemo } from 'react'

import { useSegmentedControl } from './context'
import type { SegmentedControlItemProps, SegmentedControlItemSlotProps } from './types'

export function SegmentedControlItem({
  value,
  disabled: disabledProp = false,
  as: Component = 'button',
  asChild = false,
  children,
  ...props
}: SegmentedControlItemProps & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const ctx = useSegmentedControl()
  const disabled = disabledProp || ctx.disabled
  const isSelected = ctx.selected(value)

  const slotProps = useMemo<SegmentedControlItemSlotProps>(
    () => ({
      value,
      selected: isSelected,
      disabled,
      mode: ctx.mode
    }),
    [value, isSelected, disabled, ctx.mode]
  )

  const activate = () => {
    if (!disabled) ctx.activate(value)
  }

  const renderedChildren = typeof children === 'function' ? children(slotProps) : children
  const Comp = asChild ? Slot : Component

  if (ctx.mode !== 'action') {
    return (
      <ToggleGroup.Item
        value={value}
        disabled={disabled}
        asChild={asChild}
        data-slot="item"
        {...(props as any)}
      >
        {!asChild && Component !== 'button' ? <Comp>{renderedChildren}</Comp> : renderedChildren}
      </ToggleGroup.Item>
    )
  }

  return (
    <RovingFocus.Item focusable={!disabled} asChild>
      <Comp
        type={!asChild && Component === 'button' ? 'button' : undefined}
        disabled={disabled}
        data-slot="item"
        data-state="off"
        onClick={(e: React.MouseEvent) => {
          activate()
          props.onClick?.(e as any)
        }}
        {...(props as any)}
      >
        {renderedChildren}
      </Comp>
    </RovingFocus.Item>
  )
}

export default SegmentedControlItem
