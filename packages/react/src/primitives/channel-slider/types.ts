import type { ReactNode, ElementType } from 'react'

export type ChannelSliderOrientation = 'horizontal' | 'vertical'

export interface ChannelSliderRootProps {
  /** Controlled channel value. */
  modelValue: number
  /** Accessible channel name announced by the thumb. */
  label: string
  /** Minimum channel value. */
  min?: number
  /** Maximum channel value. */
  max?: number
  /** Channel increment. */
  step?: number
  /** Slider orientation. */
  orientation?: ChannelSliderOrientation
  /** Prevents pointer and keyboard interaction. */
  disabled?: boolean
  /** Reverses the visual direction of the slider. */
  inverted?: boolean
  /** Formats the value announced by assistive technology. */
  formatValueText?: (value: number) => string

  as?: ElementType
  asChild?: boolean

  onModelValueChange?: (value: number) => void
  onValueCommit?: (value: number) => void

  children?: ReactNode | ((props: ChannelSliderRootSlotProps) => ReactNode)
}

export interface ChannelSliderPartProps {
  as?: ElementType
  asChild?: boolean
  children?: ReactNode
}

export interface ChannelSliderRootSlotProps {
  value: number
  min: number
  max: number
  step: number
  disabled: boolean
  orientation: ChannelSliderOrientation
}

export interface ChannelSliderThumbSlotProps {
  value: number
  valueText: string
  label: string
}

export interface ChannelSliderContext {
  value: number
  label: string
  valueText: string
  min: number
  max: number
  step: number
  disabled: boolean
  orientation: ChannelSliderOrientation
  slotProps: ChannelSliderRootSlotProps
  thumbSlotProps: ChannelSliderThumbSlotProps
}
