import type { HTMLAttributes, ReactNode } from 'react'
import React, { forwardRef } from 'react'
import { tv } from 'tailwind-variants'

import type { ComponentUI } from '@/components/ui/types'
import type theme from '@/theme/panel/item-row'
import itemRowTheme from '@/theme/panel/item-row'

export type PanelItemRowUI = ComponentUI<typeof theme>

export interface PanelItemRowProps extends HTMLAttributes<HTMLDivElement> {
  ui?: PanelItemRowUI
  rail?: (props: { removeClass: string }) => ReactNode
  details?: ReactNode
}

export const PanelItemRow = forwardRef<HTMLDivElement, PanelItemRowProps>(
  ({ ui, className, children, rail, details, ...props }, ref) => {
    const styles = tv(itemRowTheme)()

    return (
      <div
        ref={ref}
        data-slot="item-row"
        className={styles.root({ className: [ui?.root, className] })}
        {...props}
      >
        <div className={styles.content({ className: ui?.content })} data-slot="content">
          {children}
        </div>
        {rail && (
          <div className={styles.rail({ className: ui?.rail })} data-slot="rail">
            {rail({ removeClass: styles.remove({ className: ui?.remove }) })}
          </div>
        )}
        {details && (
          <div className={styles.details({ className: ui?.details })} data-slot="details">
            {details}
          </div>
        )}
      </div>
    )
  }
)
PanelItemRow.displayName = 'PanelItemRow'
