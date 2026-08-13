import React from 'react'
import { Slot } from '@radix-ui/react-slot'

import { usePropertySection } from './context'
import type { PropertySectionPartProps } from './types'

export function PropertySectionEmptyAction({
  asChild = false,
  children,
  ...props
}: PropertySectionPartProps & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const ctx = usePropertySection()
  
  if (!ctx.empty) {
    return null
  }

  const Comp = asChild ? Slot : 'button'
  const renderedChildren = typeof children === 'function' ? (children as any)(ctx.slotProps) : children

  return (
    <Comp type="button" data-slot="empty-action" {...ctx.stateAttrs} {...props}>
      {renderedChildren}
    </Comp>
  )
}

export default PropertySectionEmptyAction
