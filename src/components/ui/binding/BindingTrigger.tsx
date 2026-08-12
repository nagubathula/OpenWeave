import React, { forwardRef } from 'react'
import { Slot } from '@radix-ui/react-slot'
import { Diamond, DiamondPlus } from 'lucide-react'

import type { BindingState } from '@openweave/react'
import { useBindingFieldUI } from '@/components/ui/binding/ui'
import type { BindingFieldUI } from '@/components/ui/binding/ui'

export interface BindingTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean
  label: string
  state?: BindingState
  open?: boolean
  disabled?: boolean
  derived?: boolean
  ui?: BindingFieldUI
}

export const BindingTrigger = forwardRef<HTMLButtonElement, BindingTriggerProps>(
  (
    { asChild = false, label, state = 'unbound', open = false, disabled = false, derived = false, className, ui, children, ...props },
    ref
  ) => {
    const styles = useBindingFieldUI(
      { state, open, disabled, derived },
      { ...ui, trigger: [ui?.trigger, className].filter(Boolean).join(' ') }
    )

    const Comp = asChild ? Slot : 'button'

    return (
      <Comp
        ref={ref}
        className={styles.trigger}
        type={!asChild ? 'button' : undefined}
        disabled={!asChild ? disabled : undefined}
        aria-label={label}
        aria-disabled={disabled ? 'true' : undefined}
        data-state={state}
        data-open={open ? '' : undefined}
        data-disabled={disabled ? '' : undefined}
        data-derived={derived ? '' : undefined}
        data-slot="trigger"
        {...props}
      >
        {children || (
          state === 'bound' ? <Diamond className="size-3" /> : <DiamondPlus className="size-3" />
        )}
      </Comp>
    )
  }
)
BindingTrigger.displayName = 'BindingTrigger'
