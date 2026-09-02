import * as AlertDialogPrimitive from '@radix-ui/react-alert-dialog'
import type { AlertDialogProps } from '@radix-ui/react-alert-dialog'
import type { ReactNode } from 'react'
import React, { forwardRef } from 'react'

import { useDialogUI, type DialogUI, type DialogVariants } from '@/components/ui/dialog/ui'

export interface AppAlertDialogRootProps extends AlertDialogProps {
  size?: DialogVariants['size']
  height?: DialogVariants['height']
  ui?: DialogUI
  children?: ReactNode
  className?: string
  onEscapeKeyDown?: (event: KeyboardEvent) => void
}

export const AppAlertDialogRoot = forwardRef<HTMLDivElement, AppAlertDialogRootProps>(
  (
    {
      size = 'md',
      height = 'auto',
      ui,
      children,
      className,
      onEscapeKeyDown,

      open,
      onOpenChange,
      ...props
    },
    ref
  ) => {
    const cls = useDialogUI(ui, { size, height })

    return (
      <AlertDialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
        <AlertDialogPrimitive.Portal>
          <AlertDialogPrimitive.Overlay data-slot="dialog-overlay" className={cls.overlay} />
          <AlertDialogPrimitive.Content
            ref={ref}
            data-slot="dialog-content"
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
