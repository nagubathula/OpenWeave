import React from 'react'

import ColorSliderField from './ColorSliderField'
import { useColorPickerPanelContext } from './context'

const formatDegrees = (value: number) => `${Math.round(value)}°`
const formatPercent = (value: number) => `${Math.round(value)}%`

/** Hue + alpha sliders shown above the format-specific fields, for every
 * format except OkHCL (which has its own hue and alpha channels). */
export function HueAlphaSliders() {
  const ctx = useColorPickerPanelContext()
  if (ctx.isOkHCLFormat) return null

  return (
    <>
      <ColorSliderField
        label="Hue"
        value={ctx.hsb.h}
        min={0}
        max={360}
        step={1}
        displayValue={Math.round(ctx.hsb.h)}
        displayMin={0}
        displayMax={360}
        gradient={ctx.gradients.hue}
        thumbFill={ctx.thumbFills.hue}
        formatValueText={formatDegrees}
        onValueChange={ctx.updateHue}
        onDisplayChange={ctx.updateHue}
        data-test-id="color-slider-hue"
      />

      <ColorSliderField
        label="Alpha"
        value={ctx.color.a * 100}
        min={0}
        max={100}
        step={0.1}
        displayValue={Math.round(ctx.color.a * 100)}
        displayMin={0}
        displayMax={100}
        suffix="%"
        checkerboard
        gradient={ctx.gradients.alpha}
        thumbFill={ctx.thumbFills.alpha}
        formatValueText={formatPercent}
        onValueChange={(value) => ctx.updateAlpha(value / 100)}
        onDisplayChange={(value) => ctx.updateAlpha(value / 100)}
        data-test-id="color-slider-alpha"
      />
    </>
  )
}

export default HueAlphaSliders
