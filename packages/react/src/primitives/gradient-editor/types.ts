import type { ReactNode } from 'react'
import type { GradientStop } from '@openweave/scene-graph'

export interface GradientEditorStopProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'children'> {
  stop: GradientStop
  index: number
  active: boolean
  dragging?: boolean
  interactive?: boolean
  removable?: boolean
  positionStep?: number
  label?: string
  onSelect?: () => void
  onUpdatePosition?: (position: number) => void
  onUpdateColor?: (hex: string) => void
  onUpdateOpacity?: (opacity: number) => void
  onRemove?: () => void
  children?: ReactNode | ((props: GradientEditorStopSlotProps) => ReactNode)
}

export interface GradientEditorStopActions {
  select: () => void
  updatePosition: (position: number) => void
  updateColor: (hex: string) => void
  updateOpacity: (opacity: number) => void
  remove: () => void
}

export interface GradientEditorStopSlotProps {
  stop: GradientStop
  index: number
  active: boolean
  selected: boolean
  dragging: boolean
  positionPercent: number
  opacityPercent: number
  hex: string
  css: string
  actions: GradientEditorStopActions
}
