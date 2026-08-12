import React, { useState } from 'react'
import { Variable as VariableIcon } from 'lucide-react'

import { VariablesDialog } from '@/components/variables/VariablesDialog'

export interface VariablesButtonProps {
  /** Optional extra classes for the trigger button. */
  className?: string
}

/**
 * Self-contained "Local variables" trigger: renders a button that owns the
 * open state for {@link VariablesDialog}. Drop it anywhere inside the editor
 * tree (Pages/Layers toolbar, AppMenu, etc.) — it needs no wiring.
 */
export function VariablesButton({ className }: VariablesButtonProps) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        type="button"
        title="Local variables"
        aria-label="Local variables"
        data-test-id="variables-trigger"
        className={
          className ??
          'flex size-6 shrink-0 cursor-pointer items-center justify-center rounded text-muted transition-colors hover:bg-hover hover:text-surface'
        }
        onClick={() => setOpen(true)}
      >
        <VariableIcon className="size-3.5" />
      </button>
      <VariablesDialog open={open} onClose={() => setOpen(false)} />
    </>
  )
}

export default VariablesButton
