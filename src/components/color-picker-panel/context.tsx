import React, { createContext, useContext, useMemo } from 'react'

import { colorToCSS, resolveOkHCLForPreview } from '@openweave/core/color'
import type { OkHCLColor, RenderColorSpace } from '@openweave/core/color'
import { useColorModel, usePanelMessages } from '@openweave/react'
import type { ColorFieldFormat, ColorFieldOption } from '@openweave/react'
import type { Color } from '@openweave/scene-graph/primitives'

import { alphaGradient, backgroundFromDeclaration, HUE_RAINBOW_GRADIENT } from './helpers'

/**
 * Per-slot OkHCL bridge. Shape matches what
 * `src/components/properties/paint/okhcl.ts`'s `createFillOkhclAdapter` /
 * `createStrokeOkhclAdapter` build for a fill or stroke's OkHCL model.
 *
 * Passing one in makes the format selection and OkHCL edits persist against
 * a real node (round-tripping through fill/stroke plugin data instead of
 * being re-derived from the RGBA color every time, and reporting gamut
 * clipping against the actual document color space). Omitting it still
 * yields a fully working OkHCL tab -- it's simply derived from `color` on
 * the fly and checked against the display-p3 gamut.
 */
export interface OkHCLFieldControls {
  fieldFormat: ColorFieldFormat
  fieldOptions: ColorFieldOption[]
  okhcl: OkHCLColor | null
  previewColorSpace?: RenderColorSpace
  clipped?: boolean
  setFieldFormat: (format: ColorFieldFormat) => void
  updateOkHCL: (patch: Partial<OkHCLColor>) => void
}

export interface ColorPickerPanelProps {
  color: Color
  okhcl?: OkHCLFieldControls | null
  onUpdate: (color: Color) => void
}

const DEFAULT_FIELD_OPTIONS: ColorFieldOption[] = [
  { value: 'rgb', label: 'RGB' },
  { value: 'hsl', label: 'HSL' },
  { value: 'hsb', label: 'HSB' },
  { value: 'okhcl', label: 'OkHCL' }
]

function useColorPickerPanelModel({ color, okhcl = null, onUpdate }: ColorPickerPanelProps) {
  const panels = usePanelMessages()

  const colorModel = useColorModel({
    color,
    okhcl: okhcl?.okhcl ?? null,
    format: okhcl?.fieldFormat,
    onUpdate,
    onUpdateOkHCL: okhcl ? (patch) => okhcl.updateOkHCL(patch) : undefined,
    onFormatChange: okhcl ? (format) => okhcl.setFieldFormat(format) : undefined
  })

  const fieldOptions = okhcl?.fieldOptions ?? DEFAULT_FIELD_OPTIONS
  const isOkHCLFormat = colorModel.format === 'okhcl'

  // Gamut-clipping fallback for when no external OkHCL controls (and thus no
  // document-color-space-aware clip info) were supplied.
  const localPreview = useMemo(() => resolveOkHCLForPreview(colorModel.okhcl), [colorModel.okhcl])
  const previewColorSpace = okhcl?.previewColorSpace ?? localPreview.targetSpace
  const clipped = okhcl ? Boolean(okhcl.clipped) : localPreview.clipped

  const gradients = useMemo(
    () => ({
      hue: HUE_RAINBOW_GRADIENT,
      alpha: alphaGradient(color),
      hslSaturation: backgroundFromDeclaration(colorModel.sliderGradient.hslSaturation),
      hslLightness: backgroundFromDeclaration(colorModel.sliderGradient.hslLightness),
      hsbSaturation: backgroundFromDeclaration(colorModel.sliderGradient.hsbSaturation),
      hsbBrightness: backgroundFromDeclaration(colorModel.sliderGradient.hsbBrightness),
      okhclChroma: backgroundFromDeclaration(colorModel.okhclSliderGradient.okhclChroma),
      okhclLightness: backgroundFromDeclaration(colorModel.okhclSliderGradient.okhclLightness),
      okhclAlpha: alphaGradient(color)
    }),
    [color, colorModel.sliderGradient, colorModel.okhclSliderGradient]
  )

  const thumbFills = useMemo(
    () => ({
      hue: colorToCSS(colorModel.sliderPreview.hue),
      alpha: colorToCSS(color),
      hslSaturation: colorToCSS(colorModel.sliderPreview.hslSaturation),
      hslLightness: colorToCSS(colorModel.sliderPreview.hslLightness),
      hsbSaturation: colorToCSS(colorModel.sliderPreview.hsbSaturation),
      hsbBrightness: colorToCSS(colorModel.sliderPreview.hsbBrightness),
      okhclHue: colorToCSS(colorModel.okhclSliderPreview.okhclHue),
      okhclChroma: colorToCSS(colorModel.okhclSliderPreview.okhclChroma),
      okhclLightness: colorToCSS(colorModel.okhclSliderPreview.okhclLightness),
      okhclAlpha: colorToCSS(color)
    }),
    [color, colorModel.sliderPreview, colorModel.okhclSliderPreview]
  )

  return {
    ...colorModel,
    panels,
    okhclControls: okhcl,
    fieldOptions,
    isOkHCLFormat,
    previewColorSpace,
    clipped,
    gradients,
    thumbFills
  }
}

export type ColorPickerPanelContextValue = ReturnType<typeof useColorPickerPanelModel>

const ColorPickerPanelReactContext = createContext<ColorPickerPanelContextValue | null>(null)

export function ColorPickerPanelProvider({
  color,
  okhcl,
  onUpdate,
  children
}: ColorPickerPanelProps & { children: React.ReactNode }) {
  const value = useColorPickerPanelModel({ color, okhcl, onUpdate })
  return (
    <ColorPickerPanelReactContext.Provider value={value}>
      {children}
    </ColorPickerPanelReactContext.Provider>
  )
}

export function useColorPickerPanelContext(): ColorPickerPanelContextValue {
  const ctx = useContext(ColorPickerPanelReactContext)
  if (!ctx) {
    throw new Error('[color-picker] panel controls must be used within ColorPickerPanelProvider')
  }
  return ctx
}
