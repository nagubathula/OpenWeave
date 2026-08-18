import type { HTMLAttributes } from 'react'
import React, { forwardRef } from 'react'
import { tv } from 'tailwind-variants'

import type { ComponentUI } from '@/components/ui/types'
import type { PanelFieldGroupTheme } from '@/theme/panel/field-group'
import theme from '@/theme/panel/field-group'

export interface PanelFieldGroupProps extends HTMLAttributes<HTMLDivElement> {
  label?: string
  htmlFor?: string
  ui?: ComponentUI<PanelFieldGroupTheme>
}

const styles = tv(theme)()

export const PanelFieldGroup = forwardRef<HTMLDivElement, PanelFieldGroupProps>(
  ({ label, htmlFor, ui, className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        data-slot="root"
        data-panel-field-group=""
        className={styles.root({ className: [ui?.root, className] })}
        {...props}
      >
        {label && (
          <label
            data-slot="label"
            htmlFor={htmlFor}
            className={styles.label({ className: ui?.label })}
          >
            {label}
          </label>
        )}
        <div data-slot="container" className={styles.container({ className: ui?.container })}>
          {children}
        </div>
      </div>
    )
  }
)
PanelFieldGroup.displayName = 'PanelFieldGroup'
