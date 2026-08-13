import type { ReactNode } from 'react';
import React, { forwardRef } from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'

import { useDialogUI, type DialogUI } from '@/components/ui/dialog/ui'

export interface AppDialogHeaderProps extends React.HTMLAttributes<HTMLElement> {
  heading: ReactNode
  description?: ReactNode
  closeLabel?: string
  showClose?: boolean
  titleVisuallyHidden?: boolean
  ui?: DialogUI
  actions?: ReactNode
  closeIcon?: ReactNode
}

export const AppDialogHeader = forwardRef<HTMLElement, AppDialogHeaderProps>(
  ({ heading, description, closeLabel, showClose = true, titleVisuallyHidden = false, ui, actions, closeIcon, className, ...props }, ref) => {
    const cls = useDialogUI(ui)

    return (
      <header ref={ref} data-slot="dialog-header" className={`${cls.header} ${className || ''}`} {...props}>
        <div className={cls.heading}>
          <DialogPrimitive.Title
            data-slot="dialog-title"
            data-visually-hidden={titleVisuallyHidden ? '' : undefined}
            className={cls.title}
          >
            {heading}
          </DialogPrimitive.Title>
          {description && (
            <DialogPrimitive.Description
              data-slot="dialog-description"
              className={`${cls.description} mt-0.5`}
            >
              {description}
            </DialogPrimitive.Description>
          )}
        </div>
        {actions}
        {showClose && (
          <DialogPrimitive.Close asChild>
            <button type="button" data-slot="dialog-close" className={cls.close} aria-label={closeLabel}>
              {closeIcon || <X className="h-4 w-4" />}
            </button>
          </DialogPrimitive.Close>
        )}
      </header>
    )
  }
)
AppDialogHeader.displayName = 'AppDialogHeader'
