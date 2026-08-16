/**
 * Local color-space conversions replacing reka-ui's `convertToRgb`/`convertToHsl`/
 * `convertToHsb` in the React SDK. Shapes stay reka-compatible: RGB channels are
 * 0-255, HSL/HSB hue is 0-360 with percent saturation/lightness/brightness, and
 * alpha is 0-1.
 */
export interface RGBColor {
  space: 'rgb'
  r: number
  g: number
  b: number
  alpha: number
}

export interface HSLColor {
  space: 'hsl'
  h: number
  s: number
  l: number
  alpha: number
}

export interface HSBColor {
  space: 'hsb'
  h: number
  s: number
  b: number
  alpha: number
}

export type ColorValue = RGBColor | HSLColor | HSBColor

export function convertToRgb(color: ColorValue): RGBColor {
  if (color.space === 'rgb') return color
  if (color.space === 'hsl') return hslToRgb(color)
  return hsbToRgb(color)
}

export function convertToHsl(color: ColorValue): HSLColor {
  if (color.space === 'hsl') return color
  return rgbToHsl(convertToRgb(color))
}

export function convertToHsb(color: ColorValue): HSBColor {
  if (color.space === 'hsb') return color
  return rgbToHsb(convertToRgb(color))
}

function hslToRgb(color: HSLColor): RGBColor {
  const h = normalizeHue(color.h) / 360
  const s = color.s / 100
  const l = color.l / 100

  if (s === 0) {
    const gray = l * 255
    return { space: 'rgb', r: gray, g: gray, b: gray, alpha: color.alpha }
  }

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s
  const p = 2 * l - q
  return {
    space: 'rgb',
    r: hueToChannel(p, q, h + 1 / 3) * 255,
    g: hueToChannel(p, q, h) * 255,
    b: hueToChannel(p, q, h - 1 / 3) * 255,
    alpha: color.alpha
  }
}

function hsbToRgb(color: HSBColor): RGBColor {
  const h = normalizeHue(color.h) / 60
  const s = color.s / 100
  const v = color.b / 100

  const i = Math.floor(h) % 6
  const f = h - Math.floor(h)
  const p = v * (1 - s)
  const q = v * (1 - f * s)
  const t = v * (1 - (1 - f) * s)

  const [r, g, b] =
    i === 0
      ? [v, t, p]
      : i === 1
        ? [q, v, p]
        : i === 2
          ? [p, v, t]
          : i === 3
            ? [p, q, v]
            : i === 4
              ? [t, p, v]
              : [v, p, q]

  return { space: 'rgb', r: r * 255, g: g * 255, b: b * 255, alpha: color.alpha }
}

function rgbToHsl(color: RGBColor): HSLColor {
  const { max, min, hue } = rgbExtents(color)
  const l = (max + min) / 2
  const d = max - min
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1))
  return { space: 'hsl', h: hue, s: s * 100, l: l * 100, alpha: color.alpha }
}

function rgbToHsb(color: RGBColor): HSBColor {
  const { max, hue } = rgbExtents(color)
  const d = max - rgbExtents(color).min
  const s = max === 0 ? 0 : d / max
  return { space: 'hsb', h: hue, s: s * 100, b: max * 100, alpha: color.alpha }
}

function rgbExtents(color: RGBColor): { max: number; min: number; hue: number } {
  const r = color.r / 255
  const g = color.g / 255
  const b = color.b / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const d = max - min

  let hue = 0
  if (d !== 0) {
    if (max === r) hue = ((g - b) / d) % 6
    else if (max === g) hue = (b - r) / d + 2
    else hue = (r - g) / d + 4
    hue *= 60
  }
  return { max, min, hue: normalizeHue(hue) }
}

function hueToChannel(p: number, q: number, t: number): number {
  let x = t
  if (x < 0) x += 1
  if (x > 1) x -= 1
  if (x < 1 / 6) return p + (q - p) * 6 * x
  if (x < 1 / 2) return q
  if (x < 2 / 3) return p + (q - p) * (2 / 3 - x) * 6
  return p
}

function normalizeHue(value: number): number {
  const hue = value % 360
  return hue < 0 ? hue + 360 : hue
}
