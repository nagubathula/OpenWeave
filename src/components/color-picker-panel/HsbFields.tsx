import React from 'react'

import { useColorPickerPanelContext } from './context'
import ColorSliderField from './ColorSliderField'

const formatPercent = (value: number) => `${Math.round(value)}%`

export function HsbFields() {
  const ctx = useColorPickerPanelContext()
  const { h, s, b } = ctx.hsb

  return (
    <>
      <div className="grid grid-cols-[repeat(3,minmax(0,1fr))] gap-px overflow-hidden rounded border border-border bg-border">
        <input
          type="number"
          aria-label="Hue"
          className="bg-input px-2 py-1 text-xs text-surface outline-none"
          value={Math.round(h)}
          min={0}
          max={360}
          onChange={(event) => ctx.updateHSBChannel('h', Number(event.target.value))}
        />
        <input
          type="number"
          aria-label="Saturation"
          className="bg-input px-2 py-1 text-xs text-surface outline-none"
          value={Math.round(s)}
          min={0}
          max={100}
          onChange={(event) => ctx.updateHSBChannel('s', Number(event.target.value))}
        />
        <input
          type="number"
          aria-label="Brightness"
          className="bg-input px-2 py-1 text-xs text-surface outline-none"
          value={Math.round(b)}
          min={0}
          max={100}
          onChange={(event) => ctx.updateHSBChannel('b', Number(event.target.value))}
        />
      </div>

      <ColorSliderField
        label="Saturation"
        value={s}
        min={0}
        max={100}
        step={0.1}
        displayValue={Math.round(s)}
        displayMin={0}
        displayMax={100}
        suffix="%"
        gradient={ctx.gradients.hsbSaturation}
        thumbFill={ctx.thumbFills.hsbSaturation}
        formatValueText={formatPercent}
        onValueChange={(value) => ctx.updateHSBChannel('s', value)}
        onDisplayChange={(value) => ctx.updateHSBChannel('s', value)}
        data-test-id="color-slider-hsb-s"
      />

      <ColorSliderField
        label="Brightness"
        value={b}
        min={0}
        max={100}
        step={0.1}
        displayValue={Math.round(b)}
        displayMin={0}
        displayMax={100}
        suffix="%"
        gradient={ctx.gradients.hsbBrightness}
        thumbFill={ctx.thumbFills.hsbBrightness}
        formatValueText={formatPercent}
        onValueChange={(value) => ctx.updateHSBChannel('b', value)}
        onDisplayChange={(value) => ctx.updateHSBChannel('b', value)}
        data-test-id="color-slider-hsb-b"
      />

      <p className="text-[10px] leading-4 text-muted">{ctx.panels.colorHintHsb}</p>
    </>
  )
}

export default HsbFields
