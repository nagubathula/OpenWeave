import React, { forwardRef } from 'react'
import type { HTMLAttributes, ReactNode } from 'react'
import { tv } from 'tailwind-variants'

import type { ComponentUI } from '@/components/ui/types'
import type { PanelHeaderTheme } from '@/theme/panel/header'
import theme from '@/theme/panel/header'

export interface PanelHeaderProps extends HTMLAttributes<HTMLElement> {
  component?: boolean
  ui?: ComponentUI<PanelHeaderTheme>
  icon?: ReactNode
  actions?: ReactNode
}

export const PanelHeader = forwardRef<HTMLElement, PanelHeaderProps>(
  ({ component = false, ui, className, children, icon, actions, ...props }, ref) => {
    const styles = tv(theme)({ component })

    return (
      <header
        ref={ref}
        data-slot="root"
        data-component={component ? '' : undefined}
        className={styles.root({ className: [ui?.root, className] })}
        {...props}
      >
        <div data-slot="icon" className={styles.icon({ className: ui?.icon })}>
          {icon}
        </div>
        <div data-slot="title" className={styles.title({ className: ui?.title })}>
          {children}
        </div>
        {actions && (
          <div data-slot="actions" className={styles.actions({ className: ui?.actions })}>
            {actions}
          </div>
        )}
      </header>
    )
  }
)
PanelHeader.displayName = 'PanelHeader'
