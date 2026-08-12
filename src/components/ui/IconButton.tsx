import React from 'react'
import { tv } from 'tailwind-variants'

import theme from '@/theme/icon-button'
import Tip from '@/components/ui/Tip'

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean
  label?: string
  side?: 'top' | 'bottom' | 'left' | 'right'
  size?: 'sm' | 'md'
}

export default function IconButton({
  active = false,
  disabled = false,
  label,
  side = 'top',
  size = 'sm',
  type = 'button',
  className,
  children,
  ...props
}: IconButtonProps) {
  const styles = tv(theme)({ size, active, disabled, class: className })

  return (
    <Tip label={label} side={side} disabled={disabled || !label}>
      <button
        data-slot="icon-button"
        type={type}
        disabled={disabled}
        aria-label={label}
        aria-pressed={active ? 'true' : undefined}
        data-state={active ? 'on' : 'off'}
        className={styles}
        {...props}
      >
        {children}
      </button>
    </Tip>
  )
}
