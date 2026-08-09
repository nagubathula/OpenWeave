import type { LayoutAxis, SizeLimitProp } from '@openweave/vue'

export interface SizeAxisFieldProps {
  axis: LayoutAxis
  icon: string
  label: string
}

export interface SizeLimitItem {
  prop: SizeLimitProp
  icon: string
  label: string
  setLabel: string
  removeLabel: string
}

export interface SizeLimitFieldProps {
  item: SizeLimitItem
}
