import type { HTMLAttributes } from 'react'
import React, { forwardRef } from 'react'
import { twMerge } from 'tailwind-merge'

export interface AppBadgeProps extends HTMLAttributes<HTMLSpanElement> {
  ui?: {
    base?: string
  }
}

export const AppBadge = forwardRef<HTMLSpanElement, AppBadgeProps>(
  ({ ui, className, children, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={twMerge(
          'shrink-0 rounded bg-accent/10 px-1 py-px text-[9px] text-accent',
          ui?.base,
          className
        )}
        {...props}
      >
        {children}
      </span>
    )
  }
)
AppBadge.displayName = 'AppBadge'
