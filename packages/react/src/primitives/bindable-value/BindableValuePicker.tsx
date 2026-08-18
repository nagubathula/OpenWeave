import React, { type ReactNode } from 'react'
// Wait, we can use Radix primitive if we have one or just abstract it since the original was Reka ComboboxRoot.
// But Reka-ui was a Vue port of Radix UI. Radix doesn't have a native Combobox yet; people usually use cmdk or downshift.
// For now, I'll provide a placeholder or a div, but maybe we can use Radix UI Popover if it fits. I will just render a wrapper.
// The original was `<ComboboxRoot>` which means it relied on `reka-ui` which provides Combobox.
// I will just type it out and leave a generic wrapper for now since we're just making sure it compiles. Or wait, let's just make it a generic wrapper.

import { useBindableValue } from './context'
import type { BindableValueSlotProps } from './types'

export interface BindableValuePickerProps {
  children?: ReactNode | ((props: BindableValueSlotProps<any>) => ReactNode)
}

export function BindableValuePicker({
  children,
  ...props
}: BindableValuePickerProps & Omit<React.HTMLAttributes<HTMLDivElement>, 'children'>) {
  const ctx = useBindableValue()

  // In a real combobox we would use Cmdk or Radix popover + cmdk
  // For now we'll just expose the children.
  const renderedChildren = typeof children === 'function' ? children(ctx.slotProps) : children

  if (!ctx.open) return null

  return (
    <div data-slot="picker" {...props}>
      {renderedChildren}
    </div>
  )
}

export default BindableValuePicker
