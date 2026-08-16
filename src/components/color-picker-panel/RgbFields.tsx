import React from 'react'

import { useColorPickerPanelContext } from './context'

const CHANNELS = ['r', 'g', 'b'] as const
const CHANNEL_LABELS: Record<(typeof CHANNELS)[number], string> = {
  r: 'Red',
  g: 'Green',
  b: 'Blue'
}

export function RgbFields() {
  const ctx = useColorPickerPanelContext()

  return (
    <div className="grid grid-cols-[repeat(3,minmax(0,1fr))] gap-px overflow-hidden rounded border border-border bg-border">
      {CHANNELS.map((channel) => (
        <input
          key={channel}
          type="number"
          aria-label={CHANNEL_LABELS[channel]}
          className="bg-input px-2 py-1 text-xs text-surface outline-none"
          value={Math.round(ctx.rgb[channel])}
          min={0}
          max={255}
          onChange={(event) => ctx.updateRGBChannel(channel, Number(event.target.value))}
        />
      ))}
    </div>
  )
}

export default RgbFields
