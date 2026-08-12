import React, { forwardRef, ReactNode } from 'react'
import * as AlertDialogPrimitive from '@radix-ui/react-alert-dialog'

import { useDialogUI, type DialogUI, type DialogVariants } from '@/components/ui/dialog/ui'

export interface AppAlertDialogRootProps extends AlertDialogPrimitive.AlertDialogProps {
  size?: DialogVariants['size']
  height?: DialogVariants['height']
  ui?: DialogUI
  children?: ReactNode
  className?: string
  onEscapeKeyDown?: (event: KeyboardEvent) => void
  onOverlayClick?: (event: React.MouseEvent) => void
}

export const AppAlertDialogRoot = forwardRef<HTMLDivElement, AppAlertDialogRootProps>(
  ({ size = 'sm', height = 'auto', ui, children, className, onEscapeKeyDown, onOverlayClick, open, onOpenChange, ...props }, ref) => {
    const cls = useDialogUI(ui, { size, height })

    return (
      <AlertDialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
        <AlertDialogPrimitive.Portal>
          <AlertDialogPrimitive.Overlay 
            data-slot="alert-dialog-overlay" 
            className={cls.overlay} 
            onClick={onOverlayClick}
          />
          <AlertDialogPrimitive.Content
            ref={ref}
            data-slot="alert-dialog-content"
            className={`${cls.content} ${className || ''}`}
            onEscapeKeyDown={onEscapeKeyDown as any}
            {...props}
          >
            {children}
          </AlertDialogPrimitive.Content>
        </AlertDialogPrimitive.Portal>
      </AlertDialogPrimitive.Root>
    )
  }
)
AppAlertDialogRoot.displayName = 'AppAlertDialogRoot'
