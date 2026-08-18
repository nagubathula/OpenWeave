import type { BindingState } from '#react/controls/binding-provider/types'
import type { BindableValueStateAttrs } from '#react/primitives/bindable-value/types'
import type { ElementType } from 'react'

import type { Fill } from '@openweave/scene-graph'
import type { Color } from '@openweave/scene-graph/primitives'

export type FillCategory = 'SOLID' | 'GRADIENT' | 'IMAGE'

export interface FillActions {
  toSolid: () => void
  toGradient: () => void
  toImage: () => void
}

export interface FillRootSlotProps {
  fill: Fill
  category: FillCategory
  swatchBackground: string
  transparent: boolean
  actions: FillActions
}

export interface FillSwatchProps extends Omit<React.HTMLAttributes<HTMLElement>, 'children'> {
  /** Fill represented by the swatch. */
  fill: Fill
  /** Accessible name for the preview. */
  label?: string
  as?: ElementType
  asChild?: boolean
  children?: React.ReactNode | ((props: FillSwatchSlotProps) => React.ReactNode)
}

export interface FillSwatchSlotProps {
  fill: Fill
  color: Color
  category: FillCategory
  background: string
  transparent: boolean
  bindingState: BindingState | undefined
  stateAttrs: BindableValueStateAttrs | undefined
}
