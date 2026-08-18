import * as Tooltip from '@radix-ui/react-tooltip'
import React from 'react'

import { useTooltipUI } from '@/components/ui/tooltip'

interface TipProps {
  label?: string
  side?: 'top' | 'bottom' | 'left' | 'right'
  disabled?: boolean
  children: React.ReactNode
}

export default function Tip({ label, side = 'top', disabled = false, children }: TipProps) {
  const cls = useTooltipUI({ content: 'animate-in zoom-in-95 fade-in' })

  if (!label || disabled) {
    return <>{children}</>
  }

  return (
    <Tooltip.Provider delayDuration={400}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>{children}</Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content side={side} sideOffset={4} className={cls.content}>
            {label}
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  )
}
