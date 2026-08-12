import React, { forwardRef } from 'react'

import Tip from '@/components/ui/Tip'
import { useBindingFieldUI } from '@/components/ui/binding/ui'
import type { BindingFieldUI } from '@/components/ui/binding/ui'

export interface BindingPillProps extends React.HTMLAttributes<HTMLSpanElement> {
  label: string
  tooltip?: string
  disabled?: boolean
  derived?: boolean
  ui?: BindingFieldUI
}

export const BindingPill = forwardRef<HTMLSpanElement, BindingPillProps>(
  ({ label, tooltip, disabled = false, derived = false, className, ui, ...props }, ref) => {
    const styles = useBindingFieldUI(
      { state: 'bound', disabled, derived },
      { ...ui, pill: [ui?.pill, className].filter(Boolean).join(' ') }
    )

    return (
      <Tip label={tooltip} disabled={!tooltip}>
        <span
          ref={ref}
          className={styles.pill}
          data-disabled={disabled ? '' : undefined}
          data-derived={derived ? '' : undefined}
          data-slot="pill"
          {...props}
        >
          <span className={styles.pillLabel}>{label}</span>
        </span>
      </Tip>
    )
  }
)
BindingPill.displayName = 'BindingPill'
