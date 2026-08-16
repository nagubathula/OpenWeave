import React from 'react'
import { fromPercent, toPercent } from '@openweave/react'

import { useColorPickerPanelContext } from './context'
import ColorSliderField from './ColorSliderField'
import { HUE_RAINBOW_GRADIENT } from './helpers'

const formatDegrees = (value: number) => `${Math.round(value)}°`
const formatPercent = (value: number) => `${Math.round(toPercent(value))}%`

export function OkhclFields() {
  const ctx = useColorPickerPanelContext()
  if (!ctx.isOkHCLFormat) return null

  const { h, c, l, a } = ctx.okhcl

  return (
    <div className="flex flex-col gap-2">
      <ColorSliderField
        label="Hue"
        value={h}
        min={0}
        max={360}
        step={1}
        displayValue={Math.round(h)}
        displayMin={0}
        displayMax={360}
        gradient={HUE_RAINBOW_GRADIENT}
        thumbFill={ctx.thumbFills.okhclHue}
        formatValueText={formatDegrees}
        onValueChange={(value) => ctx.updateOkHCLChannel('h', value)}
        onDisplayChange={(value) => ctx.updateOkHCLChannel('h', value)}
        data-test-id="color-slider-okhcl-h"
      />

      <ColorSliderField
        label="Chroma"
        value={c}
        min={0}
        max={0.4}
        step={0.001}
        displayValue={toPercent(c)}
        displayMin={0}
        displayMax={40}
        suffix="%"
        gradient={ctx.gradients.okhclChroma}
        thumbFill={ctx.thumbFills.okhclChroma}
        formatValueText={formatPercent}
        onValueChange={(value) => ctx.updateOkHCLChannel('c', value)}
        onDisplayChange={(value) => ctx.updateOkHCLChannel('c', fromPercent(value))}
        data-test-id="color-slider-okhcl-c"
      />

      <ColorSliderField
        label="Lightness"
        value={l}
        min={0}
        max={1}
        step={0.001}
        displayValue={toPercent(l)}
        displayMin={0}
        displayMax={100}
        suffix="%"
        gradient={ctx.gradients.okhclLightness}
        thumbFill={ctx.thumbFills.okhclLightness}
        formatValueText={formatPercent}
        onValueChange={(value) => ctx.updateOkHCLChannel('l', value)}
        onDisplayChange={(value) => ctx.updateOkHCLChannel('l', fromPercent(value))}
        data-test-id="color-slider-okhcl-l"
      />

      <ColorSliderField
        label="Alpha"
        value={a ?? 1}
        min={0}
        max={1}
        step={0.001}
        displayValue={toPercent(a ?? 1)}
        displayMin={0}
        displayMax={100}
        suffix="%"
        checkerboard
        gradient={ctx.gradients.okhclAlpha}
        thumbFill={ctx.thumbFills.okhclAlpha}
        formatValueText={formatPercent}
        onValueChange={(value) => ctx.updateOkHCLChannel('a', value)}
        onDisplayChange={(value) => ctx.updateOkHCLChannel('a', fromPercent(value))}
        data-test-id="color-slider-okhcl-a"
      />

      <div className="flex items-start justify-between gap-2 text-[10px] text-muted">
        <p className="min-w-0 flex-1 leading-4 break-words">{ctx.panels.colorHintOkhcl}</p>
        {ctx.previewColorSpace ? (
          <span className="shrink-0 rounded border border-border px-1 py-0.5 text-[10px] uppercase">
            {ctx.previewColorSpace}
          </span>
        ) : null}
      </div>
      {ctx.clipped ? (
        <p className="text-[10px] leading-4 text-[var(--color-warning-text)]">
          {ctx.panels.colorPreviewClipped({ space: ctx.previewColorSpace ?? 'display-p3' })}
        </p>
      ) : null}
    </div>
  )
}

export default OkhclFields
