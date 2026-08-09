import React, { type ElementType, type ReactNode } from 'react'
import { Slot } from '@radix-ui/react-slot'
import { useBindableValue } from './context'
import type { BindableValueSlotProps } from './types'

export interface BindableValueTriggerProps {
  as?: ElementType
  asChild?: boolean
  children?: ReactNode | ((props: BindableValueSlotProps<any>) => ReactNode)
}

export function BindableValueTrigger({
  as: Component = 'button',
  asChild = false,
  children,
  ...props
}: BindableValueTriggerProps & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children'>) {
  const ctx = useBindableValue()
  
  const semanticAttrs = {
    type: !asChild && Component === 'button' ? 'button' as const : undefined,
    'aria-expanded': ctx.open,
    'aria-haspopup': 'listbox' as const
  }

  const Comp = asChild ? Slot : Component
  const renderedChildren = typeof children === 'function' ? children(ctx.slotProps) : children

  return (
    <Comp
      {...ctx.stateAttrs}
      {...semanticAttrs}
      data-slot="trigger"
      onClick={(e: React.MouseEvent) => {
        ctx.actions.togglePicker()
        props.onClick?.(e as any)
      }}
      {...(props as any)}
    >
      {renderedChildren}
    </Comp>
  )
}

export default BindableValueTrigger
