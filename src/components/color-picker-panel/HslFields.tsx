import React from 'react'

import { useColorPickerPanelContext } from './context'
import ColorSliderField from './ColorSliderField'

const formatPercent = (value: number) => `${Math.round(value)}%`

export function HslFields() {
  const ctx = useColorPickerPanelContext()
  const { h, s, l } = ctx.hsl

  return (
    <>
      <div className="grid grid-cols-[repeat(3,minmax(0,1fr))] gap-px overflow-hidden rounded border border-border bg-border">
        <input
          type="number"
          aria-label="Hue"
          className="bg-input px-2 py-1 text-xs text-surface outline-none"
          value={Math.round(h ?? 0)}
          min={0}
          max={360}
          onChange={(event) => ctx.updateHSLChannel('h', Number(event.target.value))}
        />
        <input
          type="number"
          aria-label="Saturation"
          className="bg-input px-2 py-1 text-xs text-surface outline-none"
          value={Math.round(s ?? 0)}
          min={0}
          max={100}
          onChange={(event) => ctx.updateHSLChannel('s', Number(event.target.value))}
        />
        <input
          type="number"
          aria-label="Lightness"
          className="bg-input px-2 py-1 text-xs text-surface outline-none"
          value={Math.round(l ?? 0)}
          min={0}
          max={100}
          onChange={(event) => ctx.updateHSLChannel('l', Number(event.target.value))}
        />
      </div>

      <ColorSliderField
        label="Saturation"
        value={s}
        min={0}
        max={100}
        step={0.1}
        displayValue={Math.round(s ?? 0)}
        displayMin={0}
        displayMax={100}
        suffix="%"
        gradient={ctx.gradients.hslSaturation}
        thumbFill={ctx.thumbFills.hslSaturation}
        formatValueText={formatPercent}
        onValueChange={(value) => ctx.updateHSLChannel('s', value)}
        onDisplayChange={(value) => ctx.updateHSLChannel('s', value)}
        data-test-id="color-slider-hsl-s"
      />

      <ColorSliderField
        label="Lightness"
        value={l}
        min={0}
        max={100}
        step={0.1}
        displayValue={Math.round(l ?? 0)}
        displayMin={0}
        displayMax={100}
        suffix="%"
        gradient={ctx.gradients.hslLightness}
        thumbFill={ctx.thumbFills.hslLightness}
        formatValueText={formatPercent}
        onValueChange={(value) => ctx.updateHSLChannel('l', value)}
        onDisplayChange={(value) => ctx.updateHSLChannel('l', value)}
        data-test-id="color-slider-hsl-l"
      />

      <p className="text-[10px] leading-4 text-muted">{ctx.panels.colorHintHsl}</p>
    </>
  )
}

export default HslFields
