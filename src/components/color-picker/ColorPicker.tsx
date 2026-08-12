import React, { useCallback, useMemo, useRef } from 'react'
import {
  colorToHexRaw,
  colorToRgba255,
  parseColor,
  rgba255ToColor
} from '@openweave/core/color'
import type { Color } from '@openweave/scene-graph/primitives'

interface RGB {
  r: number
  g: number
  b: number
}

interface HSV {
  h: number
  s: number
  v: number
}

function rgbToHsv({ r, g, b }: RGB): HSV {
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const d = max - min
  let h = 0
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6
    else if (max === g) h = (b - r) / d + 2
    else h = (r - g) / d + 4
    h *= 60
    if (h < 0) h += 360
  }
  const s = max === 0 ? 0 : d / max
  return { h, s, v: max }
}

function hsvToRgb({ h, s, v }: HSV): RGB {
  const c = v * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = v - c
  let r = 0
  let g = 0
  let b = 0
  if (h < 60) [r, g, b] = [c, x, 0]
  else if (h < 120) [r, g, b] = [x, c, 0]
  else if (h < 180) [r, g, b] = [0, c, x]
  else if (h < 240) [r, g, b] = [0, x, c]
  else if (h < 300) [r, g, b] = [x, 0, c]
  else [r, g, b] = [c, 0, x]
  return { r: r + m, g: g + m, b: b + m }
}

const clamp01 = (n: number) => Math.min(1, Math.max(0, n))
const clamp255 = (n: number) => Math.min(255, Math.max(0, Math.round(n)))

export interface ColorPickerProps {
  color: Color
  onChange: (color: Color) => void
}

/**
 * Functional solid-color editor: saturation/value area, hue slider, hex input
 * and R/G/B/A number inputs. Emits normalized {r,g,b,a} (0..1) colors.
 */
export function ColorPicker({ color, onChange }: ColorPickerProps) {
  const svRef = useRef<HTMLDivElement>(null)
  const hueRef = useRef<HTMLDivElement>(null)

  const hsv = useMemo(() => rgbToHsv({ r: color.r, g: color.g, b: color.b }), [color.r, color.g, color.b])
  const rgba255 = useMemo(() => colorToRgba255(color), [color])

  const emitFromHsv = useCallback((next: HSV) => {
    const rgb = hsvToRgb(next)
    onChange({ r: clamp01(rgb.r), g: clamp01(rgb.g), b: clamp01(rgb.b), a: color.a })
  }, [color.a, onChange])

  const handleSvPointer = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const el = svRef.current
    if (!el) return
    el.setPointerCapture(e.pointerId)
    const rect = el.getBoundingClientRect()
    const s = clamp01((e.clientX - rect.left) / rect.width)
    const v = clamp01(1 - (e.clientY - rect.top) / rect.height)
    emitFromHsv({ h: hsv.h, s, v })
  }, [emitFromHsv, hsv.h])

  const handleHuePointer = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const el = hueRef.current
    if (!el) return
    el.setPointerCapture(e.pointerId)
    const rect = el.getBoundingClientRect()
    const h = clamp01((e.clientX - rect.left) / rect.width) * 360
    emitFromHsv({ h, s: hsv.s, v: hsv.v })
  }, [emitFromHsv, hsv.s, hsv.v])

  const onHexChange = useCallback((raw: string) => {
    const value = raw.trim()
    if (value.length === 0) return
    const parsed = parseColor(value.startsWith('#') ? value : `#${value}`)
    onChange({ r: parsed.r, g: parsed.g, b: parsed.b, a: color.a })
  }, [color.a, onChange])

  const onChannelChange = useCallback((channel: 'r' | 'g' | 'b', v: number) => {
    const next = { ...rgba255, [channel]: clamp255(v) }
    const c = rgba255ToColor(next.r, next.g, next.b, color.a)
    onChange(c)
  }, [rgba255, color.a, onChange])

  const onAlphaChange = useCallback((v: number) => {
    onChange({ r: color.r, g: color.g, b: color.b, a: clamp01(v / 100) })
  }, [color, onChange])

  const hueColor = hsvToRgb({ h: hsv.h, s: 1, v: 1 })
  const hueCss = `rgb(${clamp255(hueColor.r * 255)},${clamp255(hueColor.g * 255)},${clamp255(hueColor.b * 255)})`

  return (
    <div className="w-56 space-y-2 text-xs">
      {/* Saturation / Value area */}
      <div
        ref={svRef}
        className="relative h-32 w-full rounded cursor-crosshair touch-none"
        style={{ backgroundColor: hueCss }}
        onPointerDown={handleSvPointer}
        onPointerMove={(e) => { if (e.buttons === 1) handleSvPointer(e) }}
      >
        <div className="absolute inset-0 rounded" style={{ background: 'linear-gradient(to right, #fff, rgba(255,255,255,0))' }} />
        <div className="absolute inset-0 rounded" style={{ background: 'linear-gradient(to top, #000, rgba(0,0,0,0))' }} />
        <div
          className="absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow"
          style={{ left: `${hsv.s * 100}%`, top: `${(1 - hsv.v) * 100}%` }}
        />
      </div>

      {/* Hue slider */}
      <div
        ref={hueRef}
        className="relative h-3 w-full rounded cursor-pointer touch-none"
        style={{ background: 'linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)' }}
        onPointerDown={handleHuePointer}
        onPointerMove={(e) => { if (e.buttons === 1) handleHuePointer(e) }}
      >
        <div
          className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow"
          style={{ left: `${(hsv.h / 360) * 100}%` }}
        />
      </div>

      {/* Hex + Alpha */}
      <div className="flex gap-2">
        <label className="flex flex-1 items-center gap-1 bg-input/50 rounded px-2 py-1 border border-border">
          <span className="text-muted text-[10px]">#</span>
          <input
            type="text"
            className="w-full bg-transparent outline-none text-surface uppercase"
            value={colorToHexRaw(color)}
            onChange={(e) => onHexChange(e.target.value)}
          />
        </label>
        <label className="flex w-16 items-center gap-1 bg-input/50 rounded px-2 py-1 border border-border">
          <input
            type="number"
            min={0}
            max={100}
            className="w-full bg-transparent outline-none text-surface"
            value={Math.round(color.a * 100)}
            onChange={(e) => onAlphaChange(Number(e.target.value))}
          />
          <span className="text-muted text-[10px]">%</span>
        </label>
      </div>

      {/* R / G / B inputs */}
      <div className="grid grid-cols-3 gap-2">
        {(['r', 'g', 'b'] as const).map((ch) => (
          <label key={ch} className="flex items-center gap-1 bg-input/50 rounded px-2 py-1 border border-border">
            <span className="text-muted text-[10px] uppercase">{ch}</span>
            <input
              type="number"
              min={0}
              max={255}
              className="w-full bg-transparent outline-none text-surface"
              value={rgba255[ch]}
              onChange={(e) => onChannelChange(ch, Number(e.target.value))}
            />
          </label>
        ))}
      </div>
    </div>
  )
}

export default ColorPicker
