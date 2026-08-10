import React, { type ReactNode } from 'react'

import { useNumberField } from './context'

export type NumberFieldPartName = 'leading' | 'unit' | 'trailing' | 'menu'

export interface NumberFieldPartProps extends React.HTMLAttributes<HTMLSpanElement> {
  children?: ReactNode | ((props: Record<string, unknown>) => ReactNode)
}

function createNumberFieldPart(part: NumberFieldPartName) {
  const Component = React.forwardRef<HTMLSpanElement, NumberFieldPartProps>(
    ({ children, ...props }, ref) => {
      const ctx = useNumberField()
      const renderedChildren = typeof children === 'function' ? children(ctx.slotProps) : children

      return (
        <span ref={ref} {...props} {...ctx.stateAttrs} data-slot={part}>
          {renderedChildren}
        </span>
      )
    }
  )
  
  Component.displayName = `NumberField${part.charAt(0).toUpperCase()}${part.slice(1)}`
  return Component
}

export const NumberFieldLeading = createNumberFieldPart('leading')
export const NumberFieldUnit = createNumberFieldPart('unit')
export const NumberFieldTrailing = createNumberFieldPart('trailing')
export const NumberFieldMenu = createNumberFieldPart('menu')
