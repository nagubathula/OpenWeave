import type { HTMLAttributes } from 'react'
import React, { forwardRef } from 'react'

import { useDialogUI, type DialogUI } from '@/components/ui/dialog/ui'

export interface AppDialogBodyProps extends HTMLAttributes<HTMLDivElement> {
  ui?: DialogUI
}

export const AppDialogBody = forwardRef<HTMLDivElement, AppDialogBodyProps>(
  ({ ui, className, children, ...props }, ref) => {
    const cls = useDialogUI(ui)
    return (
      <div
        ref={ref}
        data-slot="dialog-body"
        className={`${cls.body} ${className || ''}`}
        {...props}
      >
        {children}
      </div>
    )
  }
)
AppDialogBody.displayName = 'AppDialogBody'
