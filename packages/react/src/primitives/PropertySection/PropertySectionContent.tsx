import React, { type ReactNode } from 'react'
import * as Collapsible from '@radix-ui/react-collapsible'

import { usePropertySection } from './context'
import type { PropertySectionPartProps } from './types'

export function PropertySectionContent({
  asChild = false,
  children,
  ...props
}: PropertySectionPartProps & React.HTMLAttributes<HTMLDivElement>) {
  const ctx = usePropertySection()
  
  const renderedChildren = typeof children === 'function' ? (children as any)(ctx.slotProps) : children

  return (
    <Collapsible.Content asChild={asChild} data-slot="content" {...ctx.stateAttrs} {...props}>
      {renderedChildren}
    </Collapsible.Content>
  )
}

export default PropertySectionContent
