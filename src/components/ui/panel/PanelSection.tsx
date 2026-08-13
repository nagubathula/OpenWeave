import React from 'react'
import { tv } from 'tailwind-variants'
import {
  PropertySectionRoot,
  PropertySectionHeader,
  PropertySectionTitle,
  PropertySectionActions,
  PropertySectionContent,
  PropertySectionEmptyAction
} from '@openweave/react'

import theme from '@/theme/panel/section'

export interface PanelSectionProps {
  label: string
  open?: boolean
  defaultOpen?: boolean
  empty?: boolean
  className?: string
  children: React.ReactNode
  actions?: React.ReactNode
  emptyAction?: React.ReactNode
}

export default function PanelSection({
  label,
  open,
  defaultOpen = true,
  empty = false,
  className,
  children,
  actions,
  emptyAction
}: PanelSectionProps) {
  const styles = tv(theme)({ actions: Boolean(actions) })

  return (
    <PropertySectionRoot
      open={open}
      defaultOpen={defaultOpen}
      empty={empty}
      // The Vue version rendered `as="section"`; an explicit region role restores the
      // same landmark so tests and AT can address sections by accessible name.
      role="region"
      aria-label={label}
      className={styles.root({ class: className })}
    >
      <PropertySectionHeader className={styles.header()}>
        <PropertySectionTitle className={styles.title()}>
          <span role="heading" aria-level={3}>{label}</span>
        </PropertySectionTitle>
        {actions && (
          <PropertySectionActions className={styles.actions()}>
            {actions}
          </PropertySectionActions>
        )}
      </PropertySectionHeader>
      <PropertySectionContent className={styles.body()}>
        {children}
        {emptyAction && (
          <PropertySectionEmptyAction asChild>
            {emptyAction}
          </PropertySectionEmptyAction>
        )}
      </PropertySectionContent>
    </PropertySectionRoot>
  )
}
