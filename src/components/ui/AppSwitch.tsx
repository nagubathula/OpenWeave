import React, { forwardRef } from 'react'
import * as SwitchPrimitive from '@radix-ui/react-switch'
import { tv } from 'tailwind-variants'

import type { ComponentUI } from '@/components/ui/types'
import type { SwitchTheme } from '@/theme/switch'
import theme from '@/theme/switch'

export type AppSwitchUI = ComponentUI<SwitchTheme>

export interface AppSwitchProps extends Omit<SwitchPrimitive.SwitchProps, 'checked' | 'onCheckedChange' | 'value'> {
  label?: string
  size?: keyof SwitchTheme['variants']['size']
  state?: keyof SwitchTheme['variants']['state']
  ui?: AppSwitchUI
  value?: boolean
  onValueChange?: (value: boolean) => void
}

export const AppSwitch = forwardRef<HTMLButtonElement, AppSwitchProps>(
  ({ label, size = 'sm', state = 'idle', ui, value, onValueChange, className, ...props }, ref) => {
    const styles = tv(theme)({ size, state })

    return (
      <SwitchPrimitive.Root
        ref={ref}
        checked={value}
        onCheckedChange={onValueChange}
        aria-label={label}
        data-mixed={state === 'mixed' ? '' : undefined}
        className={styles.root({ className: [ui?.root, className] })}
        {...props}
      >
        <SwitchPrimitive.Thumb className={styles.thumb({ className: ui?.thumb })} />
      </SwitchPrimitive.Root>
    )
  }
)
AppSwitch.displayName = 'AppSwitch'
