import { colorToCSS } from '@openweave/core/color'
import type { Color } from '@openweave/scene-graph/primitives'

/**
 * Rainbow gradient shared by every hue slider (RGB-space and OkHCL alike --
 * hue is the same rotation regardless of which model's S/L/B channels ride
 * along with it).
 */
export const HUE_RAINBOW_GRADIENT =
  'linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)'

/**
 * `useColorModel`'s gradient models (`sliderGradient`, `okhclSliderGradient`)
 * return full `background: <value>;` CSS declarations -- that shape exists so
 * Vue could bind them straight onto a string-valued `:style`. React's `style`
 * prop takes an object, so pull the declaration's value back out for use as a
 * `background` style property.
 */
export function backgroundFromDeclaration(declaration: string): string {
  const match = /background:\s*(.+?);?\s*$/.exec(declaration)
  return match ? match[1] : declaration
}

/** Transparent -> fully-opaque gradient for an alpha slider tracking `color`. */
export function alphaGradient(color: Color): string {
  return `linear-gradient(to right, transparent, ${colorToCSS({ ...color, a: 1 })})`
}

export function clampRange(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

/** HSB (h: 0-360, s: 0-100, b: 0-100) -> normalized (0-1) RGB. */
export function hsbToRgb01(h: number, s: number, b: number): { r: number; g: number; b: number } {
  const hue = ((h % 360) + 360) % 360
  const sat = clampRange(s, 0, 100) / 100
  const val = clampRange(b, 0, 100) / 100
  const c = val * sat
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1))
  const m = val - c
  let r = 0
  let g = 0
  let bl = 0
  if (hue < 60) [r, g, bl] = [c, x, 0]
  else if (hue < 120) [r, g, bl] = [x, c, 0]
  else if (hue < 180) [r, g, bl] = [0, c, x]
  else if (hue < 240) [r, g, bl] = [0, x, c]
  else if (hue < 300) [r, g, bl] = [x, 0, c]
  else [r, g, bl] = [c, 0, x]
  return { r: r + m, g: g + m, b: bl + m }
}
