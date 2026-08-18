import * as DialogPrimitive from '@radix-ui/react-dialog'
import React, { forwardRef } from 'react'

export const AppDialogClose = forwardRef<HTMLButtonElement, DialogPrimitive.DialogCloseProps>(
  ({ children, ...props }, ref) => {
    return (
      <DialogPrimitive.Close ref={ref} {...props} asChild>
        {children}
      </DialogPrimitive.Close>
    )
  }
)
AppDialogClose.displayName = 'AppDialogClose'
