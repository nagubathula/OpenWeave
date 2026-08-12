import React from 'react'
import { tv } from 'tailwind-variants'
import { PropertyGridRoot } from '@openweave/react'

import theme from '@/theme/panel/grid'

export interface PanelGridProps {
  columns?: 1 | 2 | 3
  distribution?: 'equal' | 'wide-first'
  className?: string
  children: React.ReactNode
  actions?: React.ReactNode
}

export default function PanelGrid({
  columns = 1,
  distribution = 'equal',
  className,
  children,
  actions
}: PanelGridProps) {
  const styles = tv(theme)({ columns, distribution, class: className })

  return (
    <PropertyGridRoot
      columns={columns}
      distribution={distribution}
      className={styles}
    >
      {children}
      {actions && (
        <React.Fragment key="actions">
          {actions}
        </React.Fragment>
      )}
    </PropertyGridRoot>
  )
}
