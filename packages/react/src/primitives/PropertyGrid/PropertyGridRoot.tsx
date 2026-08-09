import React from 'react'
import type { PropertyGridRootProps } from './types'

export function PropertyGridRoot({
  columns = 1,
  distribution = 'equal',
  actions,
  children,
  ...props
}: PropertyGridRootProps) {
  return (
    <div
      {...props}
      data-slot="root"
      data-property-grid=""
      data-columns={columns}
      data-distribution={distribution}
    >
      <div data-slot="fields">
        {children}
      </div>
      {actions && (
        <div data-slot="actions">
          {actions}
        </div>
      )}
    </div>
  )
}

export default PropertyGridRoot
