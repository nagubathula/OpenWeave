import React from 'react'
import { tv } from 'tailwind-variants'

import type { ToolbarUI } from '@/components/toolbar/types'
import toolbarTheme from '@/theme/toolbar'

interface ToolButtonProps {
  icon: React.ElementType
  label?: string
  active?: boolean
  mobile?: boolean
  ui?: ToolbarUI
  onClick?: () => void
  'data-test-id'?: string
}

const toolbar = tv(toolbarTheme)

export default function ToolButton({
  icon: Icon,
  label,
  active = false,
  mobile = false,
  ui,
  onClick,
  'data-test-id': dataTestId
}: ToolButtonProps) {
  const styles = toolbar({ active, mobile })

  return (
    <button
      data-active={active || undefined}
      data-mobile={mobile || undefined}
      data-test-id={dataTestId}
      aria-label={label}
      className={styles.button({ className: ui?.button })}
      onClick={onClick}
    >
      <Icon className={styles.icon({ className: ui?.icon })} />
    </button>
  )
}
