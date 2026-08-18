import React from 'react'
import { tv } from 'tailwind-variants'

import { SegmentedControlRoot, SegmentedControlItem } from '@openweave/react'

import Tip from '@/components/ui/Tip'
import theme from '@/theme/segmented-control'

export interface SegmentedControlOption {
  value: string
  label: string
  disabled?: boolean
  icon?: React.ReactNode
}

export interface SegmentedControlProps {
  options: SegmentedControlOption[]
  label?: string
  size?: 'sm' | 'md'
  value: string
  onChange: (value: string) => void
  className?: string
}

export default function SegmentedControl({
  options,
  label,
  size = 'sm',
  value,
  onChange,
  className
}: SegmentedControlProps) {
  const styles = tv(theme)({ size })

  return (
    <SegmentedControlRoot
      modelValue={value}
      onModelValueChange={onChange as (val: string | string[] | undefined) => void}
      aria-label={label}
      className={styles.root({ class: className })}
    >
      {options.map((option) => (
        <Tip key={option.value} label={option.label} disabled={!option.icon}>
          <SegmentedControlItem
            value={option.value}
            aria-label={option.label}
            disabled={option.disabled}
            className={styles.item()}
          >
            {option.icon ? option.icon : <span className="truncate">{option.label}</span>}
          </SegmentedControlItem>
        </Tip>
      ))}
    </SegmentedControlRoot>
  )
}
