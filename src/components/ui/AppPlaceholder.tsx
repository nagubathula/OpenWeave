import React, { forwardRef } from 'react'
import type { HTMLAttributes, ReactNode } from 'react'
import { tv, type VariantProps } from 'tailwind-variants'

import placeholderTheme from '@/theme/placeholder'

const placeholder = tv(placeholderTheme)

type PlaceholderVariants = VariantProps<typeof placeholder>
type PlaceholderUI = {
  root?: string
  content?: string
  icon?: string
  label?: string
  description?: string
  action?: string
}

export interface AppPlaceholderProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  label: string
  description?: ReactNode
  fill?: boolean
  size?: PlaceholderVariants['size']
  ui?: PlaceholderUI
  icon?: ReactNode
  action?: ReactNode
}

export const AppPlaceholder = forwardRef<HTMLDivElement, AppPlaceholderProps>(
  (
    { label, description, fill = true, size = 'panel', ui, icon, action, className, ...props },
    ref
  ) => {
    const theme = placeholder({ fill, size })
    const styles = {
      root: theme.root({ className: ui?.root }),
      content: theme.content({ className: ui?.content }),
      icon: theme.icon({ className: ui?.icon }),
      label: theme.label({ className: ui?.label }),
      description: theme.description({ className: ui?.description }),
      action: theme.action({ className: ui?.action })
    }

    return (
      <div ref={ref} className={styles.root} data-slot="placeholder" {...props}>
        <div className={styles.content} data-slot="placeholder-content">
          {icon && (
            <div className={styles.icon} data-slot="placeholder-icon" aria-hidden="true">
              {icon}
            </div>
          )}
          <p className={styles.label} data-slot="placeholder-label">
            {label}
          </p>
          {description && (
            <div className={styles.description} data-slot="placeholder-description">
              {description}
            </div>
          )}
          {action && (
            <div className={styles.action} data-slot="placeholder-action">
              {action}
            </div>
          )}
        </div>
      </div>
    )
  }
)
AppPlaceholder.displayName = 'AppPlaceholder'
