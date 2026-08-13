import React from 'react'
import { Slot } from '@radix-ui/react-slot'

import { usePropertySection } from './context'
import type { PropertySectionPartProps } from './types'

export function PropertySectionActions({
  asChild = false,
  children,
  ...props
}: PropertySectionPartProps & React.HTMLAttributes<HTMLDivElement>) {
  const ctx = usePropertySection()
  
  const Comp = asChild ? Slot : 'div'
  const renderedChildren = typeof children === 'function' ? (children as any)(ctx.slotProps) : children

  return (
    <Comp data-slot="actions" {...ctx.stateAttrs} {...props}>
      {renderedChildren}
    </Comp>
  )
}

export default PropertySectionActions
