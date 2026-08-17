/* eslint-disable openweave/no-hardcoded-tip-labels */
import React, { useState } from 'react'
import { Variable as VariableIcon } from 'lucide-react'
import Tip from '@/components/ui/Tip'

import { VariablesDialog } from '@/components/variables/VariablesDialog'

export interface VariablesButtonProps {
  className?: string
}

function VariablesButton({ className }: VariablesButtonProps) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Tip label="Local variables">
        <button
          type="button"
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
      </Tip>
      <VariablesDialog open={open} onClose={() => setOpen(false)} />
    </>
  )
}

export default VariablesButton
