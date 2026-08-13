import React, { type ReactNode } from 'react'
import { useNumberField } from './context'

export interface NumberFieldValueProps extends Omit<React.HTMLAttributes<HTMLSpanElement>, 'children'> {
  children?: ReactNode | ((props: { value: string; [key: string]: any }) => ReactNode)
}

export function NumberFieldValue({ children, ...props }: NumberFieldValueProps) {
  const ctx = useNumberField()

  if (ctx.editing) return null

  const renderedChildren = typeof children === 'function' 
    ? children({ ...ctx.slotProps, value: ctx.displayValue }) 
    : (children ?? (ctx.isMixed ? ctx.slotProps.placeholder : ctx.displayValue))

  return (
    <span {...ctx.stateAttrs} data-slot="value" {...props}>
      {renderedChildren}
    </span>
  )
}

export default NumberFieldValue
