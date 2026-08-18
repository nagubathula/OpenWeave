import { useState, useMemo, useCallback } from 'react'

import { colorToHexRaw, okhclToRGBA, parseColor } from '@openweave/core/color'
import type { Color } from '@openweave/scene-graph/primitives'

import {
  applyOkHCLPatch,
  colorsEqual,
  createColorModelValue,
  createOkHCLSliderGradientModel,
  createOkHCLSliderPreviewModel,
  createSliderGradientModel,
  createSliderPreviewModel,
  normalizeOkHCLPatch,
  okhclPatchChangesColor,
  rekaToSceneColor,
  withAlpha,
  withHSBChannel,
  withHSLChannel,
  withHue,
  withRGBChannel
} from './model'
import type {
  ColorFieldFormat,
  HSBChannel,
  HSLChannel,
  OkHCLChannel,
  RGBChannel,
  RekaColorValue,
  UseColorModelOptions
} from './types'

export const BUILT_IN_COLOR_FORMATS = ['hex', 'rgb', 'hsl', 'hsb', 'okhcl'] as const

export function useColorModel(options: UseColorModelOptions) {
  const [localFormat, setLocalFormat] = useState<ColorFieldFormat>(options.defaultFormat ?? 'rgb')

  const color = options.color
  const sourceOkHCL = options.okhcl ?? null
  const format = options.format ?? localFormat

  const value = useMemo(() => createColorModelValue(color, sourceOkHCL), [color, sourceOkHCL])
  const hex = useMemo(() => colorToHexRaw(color), [color])
  const sliderPreview = useMemo(() => createSliderPreviewModel(value), [value])
  const sliderGradient = useMemo(() => createSliderGradientModel(value), [value])
  const okhclSliderPreview = useMemo(
    () => createOkHCLSliderPreviewModel(value.okhcl),
    [value.okhcl]
  )
  const okhclSliderGradient = useMemo(
    () => createOkHCLSliderGradientModel(value.okhcl),
    [value.okhcl]
  )

  const emitColor = useCallback(
    (nextColor: Color) => {
      if (!colorsEqual(color, nextColor)) options.onUpdate?.(nextColor)
      return nextColor
    },
    [color, options.onUpdate]
  )

  const updateHex = useCallback(
    (input: string) => {
      const parsed = parseColor(input.startsWith('#') ? input : `#${input}`)
      return emitColor({ ...parsed, a: color.a })
    },
    [color.a, emitColor]
  )

  const setFormat = useCallback(
    (nextFormat: ColorFieldFormat) => {
      if (format === nextFormat) return
      setLocalFormat(nextFormat)
      options.onFormatChange?.(nextFormat)
    },
    [format, options.onFormatChange]
  )

  const updateFromReka = useCallback(
    (nextColor: RekaColorValue) => {
      return emitColor(rekaToSceneColor(nextColor))
    },
    [emitColor]
  )

  const updateHue = useCallback(
    (hue: number) => {
      return emitColor(withHue(value, hue))
    },
    [value, emitColor]
  )

  const updateAlpha = useCallback(
    (alpha: number) => {
      return emitColor(withAlpha(color, alpha))
    },
    [color, emitColor]
  )

  const updateRGBChannel = useCallback(
    (channel: RGBChannel, channelValue: number) => {
      return emitColor(withRGBChannel(color, channel, channelValue))
    },
    [color, emitColor]
  )

  const updateHSLChannel = useCallback(
    (channel: HSLChannel, channelValue: number) => {
      return emitColor(withHSLChannel(value, channel, channelValue))
    },
    [value, emitColor]
  )

  const updateHSBChannel = useCallback(
    (channel: HSBChannel, channelValue: number) => {
      return emitColor(withHSBChannel(value, channel, channelValue))
    },
    [value, emitColor]
  )

  const updateOkHCLChannel = useCallback(
    (channel: OkHCLChannel, channelValue: number) => {
      const patch = normalizeOkHCLPatch(channel, channelValue)
      if (!okhclPatchChangesColor(value.okhcl, patch)) return value.okhcl

      if (options.onUpdateOkHCL) {
        options.onUpdateOkHCL(patch)
        return applyOkHCLPatch(value.okhcl, patch)
      }

      const next = applyOkHCLPatch(value.okhcl, patch)
      emitColor(okhclToRGBA(next))
      return next
    },
    [value.okhcl, options.onUpdateOkHCL, emitColor]
  )

  return {
    color,
    format,
    hex,
    rekaColor: value.rekaColor,
    rgb: value.rgb,
    hsl: value.hsl,
    hsb: value.hsb,
    okhcl: value.okhcl,
    sliderPreview,
    sliderGradient,
    okhclSliderPreview,
    okhclSliderGradient,
    setFormat,
    updateColor: emitColor,
    updateHex,
    updateFromReka,
    updateHue,
    updateAlpha,
    updateRGBChannel,
    updateHSLChannel,
    updateHSBChannel,
    updateOkHCLChannel
  }
}
