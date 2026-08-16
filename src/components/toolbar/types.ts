import type React from 'react'
import type { Tool } from '@openweave/react'
import type { ComponentUI } from '@/components/ui/types'
import type { ToolbarTheme } from '@/theme/toolbar'

export interface ToolbarActionItem {
  icon: React.ElementType
  label: string
  action: () => void
}

export type ToolbarUI = ComponentUI<ToolbarTheme>

export type ToolLabels = Record<Tool, string>
export type ToolIconMap = Record<Tool, React.ElementType>
