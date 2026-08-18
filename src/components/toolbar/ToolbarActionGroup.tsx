import React from 'react'
import { tv } from 'tailwind-variants'

import type { ToolbarActionItem, ToolbarUI } from '@/components/toolbar/types'
import toolbarTheme from '@/theme/toolbar'

interface ToolbarActionGroupProps {
  actions: ToolbarActionItem[]
  testPrefix: string
  ui?: ToolbarUI
  onAction: (item: ToolbarActionItem) => void
}

const styles = tv(toolbarTheme)()

export default function ToolbarActionGroup({
  actions,
  testPrefix,
  ui,
  onAction
}: ToolbarActionGroupProps) {
  return (
    <>
      {actions.map((item) => {
        const ActionIcon = item.icon
        return (
          <button
            key={item.label}
            data-test-id={`${testPrefix}-${item.label.toLowerCase()}`}
            className={styles.action({ className: ui?.action })}
            onClick={() => onAction(item)}
          >
            <ActionIcon className={styles.actionIcon({ className: ui?.actionIcon })} />
          </button>
        )
      })}
    </>
  )
}
