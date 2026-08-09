import React from 'react'
import { twMerge } from 'tailwind-merge'

interface AppShortcutTextProps {
  ui?: {
    base?: string
  }
  children?: React.ReactNode
}

export default function AppShortcutText({ ui, children }: AppShortcutTextProps) {
  const cls = twMerge('text-[11px] text-muted', ui?.base)
  return <span className={cls}>{children}</span>
}
