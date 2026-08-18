import * as DialogPrimitive from '@radix-ui/react-dialog'
import type { DialogProps } from '@radix-ui/react-dialog'
import type { ReactNode } from 'react'
import React, { forwardRef } from 'react'

import { useDialogUI, type DialogUI, type DialogVariants } from '@/components/ui/dialog/ui'

export interface AppDialogRootProps extends DialogProps {
  size?: DialogVariants['size']
  height?: DialogVariants['height']
  ui?: DialogUI
  children?: ReactNode
  className?: string
  onEscapeKeyDown?: (event: KeyboardEvent) => void
  onPointerDownOutside?: (event: any) => void
  onInteractOutside?: (event: any) => void
}

export const AppDialogRoot = forwardRef<HTMLDivElement, AppDialogRootProps>(
  (
    {
      size = 'md',
      height = 'auto',
      ui,
      children,
      className,
      onEscapeKeyDown,
      onPointerDownOutside,
      onInteractOutside,
      open,
      // eslint-disable-next-line @typescript-eslint/unbound-method
      onOpenChange,
      ...props
    },
    ref
  ) => {
    const cls = useDialogUI(ui, { size, height })

    return (
      <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay data-slot="dialog-overlay" className={cls.overlay} />
          <DialogPrimitive.Content
            ref={ref}
            data-slot="dialog-content"
            className={`${cls.content} ${className || ''}`}
            onEscapeKeyDown={onEscapeKeyDown as any}
            onPointerDownOutside={onPointerDownOutside as any}
            onInteractOutside={onInteractOutside as any}
            {...props}
          >
            {children}
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    )
  }
)
AppDialogRoot.displayName = 'AppDialogRoot'
