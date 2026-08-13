import type { HTMLAttributes } from 'react';
import React, { forwardRef } from 'react'
import { useDialogUI, type DialogUI } from '@/components/ui/dialog/ui'

export interface AppDialogFooterProps extends HTMLAttributes<HTMLDivElement> {
  ui?: DialogUI
}

export const AppDialogFooter = forwardRef<HTMLDivElement, AppDialogFooterProps>(
  ({ ui, className, children, ...props }, ref) => {
    const cls = useDialogUI(ui)
    return (
      <footer ref={ref} data-slot="dialog-footer" className={`${cls.footer} ${className || ''}`} {...props}>
        {children}
      </footer>
    )
  }
)
AppDialogFooter.displayName = 'AppDialogFooter'
