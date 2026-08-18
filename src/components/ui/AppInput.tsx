import type { InputHTMLAttributes } from 'react'
import React, { forwardRef } from 'react'
import type { VariantProps } from 'tailwind-variants'
import { tv } from 'tailwind-variants'

import theme from '@/theme/input'

const inputClass = tv(theme)

export interface AppInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  tone?: VariantProps<typeof inputClass>['tone']
  size?: VariantProps<typeof inputClass>['size']
  state?: VariantProps<typeof inputClass>['state']
  onEnter?: (event: React.KeyboardEvent<HTMLInputElement>) => void
}

export const AppInput = forwardRef<HTMLInputElement, AppInputProps>(
  (
    { tone = 'default', size = 'md', state = 'idle', className, onEnter, onKeyDown, ...props },
    ref
  ) => {
    return (
      <input
        ref={ref}
        className={inputClass({ tone, size, state, className })}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            onEnter?.(e)
          }
          onKeyDown?.(e)
        }}
        {...props}
      />
    )
  }
)
AppInput.displayName = 'AppInput'
