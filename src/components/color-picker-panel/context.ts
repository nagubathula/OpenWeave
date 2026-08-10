import { createContext, useContext } from 'react'

import type { Color } from '@openweave/scene-graph/primitives'
import { useI18n, type OkHCLControls } from '@openweave/react'

export interface ColorPanelProps {
  color: Color
  okhcl?: OkHCLControls | null
  onUpdate?: (color: Color) => void
}

export type ColorPickerPanelContext = {
  color: Color
  okhcl: OkHCLControls | null
  onUpdate?: (color: Color) => void
  panels: ReturnType<typeof useI18n>['panels']
}

const ColorPickerPanelReactContext = createContext<ColorPickerPanelContext | null>(null)

export const ColorPickerPanelProvider = ColorPickerPanelReactContext.Provider

export function useColorPickerPanelContext(): ColorPickerPanelContext {
  const ctx = useContext(ColorPickerPanelReactContext)
  if (!ctx) throw new Error('Color picker panel controls must be used within ColorPickerPanel')
  return ctx
}
