import React, { forwardRef } from 'react'
import type { ButtonHTMLAttributes } from 'react'
import { twMerge } from 'tailwind-merge'

export interface AppTextButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  ui?: {
    base?: string
  }
  size?: 'xs' | 'sm'
  underline?: boolean
}

export const AppTextButton = forwardRef<HTMLButtonElement, AppTextButtonProps>(
  ({ ui, size = 'sm', underline = false, className, children, type = 'button', ...props }, ref) => {
    return (
      <button
        ref={ref}
        type={type}
        className={twMerge(
          'cursor-pointer text-muted hover:text-surface',
          size === 'xs' ? 'text-[9px]' : 'text-[10px]',
          underline && 'underline',
          ui?.base,
          className
        )}
        {...props}
      >
        {children}
      </button>
    )
  }
)
AppTextButton.displayName = 'AppTextButton'
