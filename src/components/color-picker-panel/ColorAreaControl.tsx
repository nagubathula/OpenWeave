import React, { useCallback, useRef } from 'react'

import { colorToCSS } from '@openweave/core/color'

import { useColorPickerPanelContext } from './context'
import { clampRange, hsbToRgb01 } from './helpers'

/**
 * Saturation/brightness area. There is no accessible 2D "color area"
 * primitive exported from `@openweave/react` (reka-ui's `ColorAreaRoot` has
 * no React port), so this stays a hand-rolled pointer surface -- but it now
 * reads/writes through the shared panel context so its notion of "hue"
 * always matches the hue slider exactly (both derive from the same
 * `useColorModel` instance).
 */
export function ColorAreaControl() {
  const ctx = useColorPickerPanelContext()
  const areaRef = useRef<HTMLDivElement>(null)
  const { h, s, b } = ctx.hsb

  const handlePointer = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const el = areaRef.current
      if (!el) return
      el.setPointerCapture(event.pointerId)
      const rect = el.getBoundingClientRect()
      const nextS = clampRange(((event.clientX - rect.left) / rect.width) * 100, 0, 100)
      const nextB = clampRange((1 - (event.clientY - rect.top) / rect.height) * 100, 0, 100)
      const rgb = hsbToRgb01(h, nextS, nextB)
      ctx.updateColor({ r: rgb.r, g: rgb.g, b: rgb.b, a: ctx.color.a })
    },
    [ctx, h]
  )

  const hueCss = colorToCSS({ ...hsbToRgb01(h, 100, 100), a: 1 })

  return (
    <div
      ref={areaRef}
      className="relative h-32 w-full cursor-crosshair touch-none rounded"
      style={{ backgroundColor: hueCss }}
      onPointerDown={handlePointer}
      onPointerMove={(event) => {
        if (event.buttons === 1) handlePointer(event)
      }}
      data-test-id="color-area"
    >
      <div
        className="absolute inset-0 rounded"
        style={{ background: 'linear-gradient(to right, #fff, rgba(255,255,255,0))' }}
      />
      <div
        className="absolute inset-0 rounded"
        style={{ background: 'linear-gradient(to top, #000, rgba(0,0,0,0))' }}
      />
      <div
        className="pointer-events-none absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-sm"
        style={{ left: `${s}%`, top: `${100 - b}%` }}
      />
    </div>
  )
}

export default ColorAreaControl
