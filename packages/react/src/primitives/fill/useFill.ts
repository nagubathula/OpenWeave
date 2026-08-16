import { useMemo, useCallback } from 'react'

import { colorToCSS } from '@openweave/core/color'
import type { Fill, GradientStop } from '@openweave/scene-graph'
import type { Color } from '@openweave/scene-graph/primitives'

import type { FillCategory } from './types'

const FILL_CATEGORY: Partial<Record<Fill['type'], FillCategory>> = {
  SOLID: 'SOLID',
  GRADIENT_LINEAR: 'GRADIENT',
  GRADIENT_RADIAL: 'GRADIENT',
  GRADIENT_ANGULAR: 'GRADIENT',
  GRADIENT_DIAMOND: 'GRADIENT',
  IMAGE: 'IMAGE'
}

function effectiveColor(color: Color, opacity: number): Color {
  return { ...color, a: color.a * opacity }
}

function gradientCSS(stops: GradientStop[], opacity: number): string {
  return stops
    .map((stop) => `${colorToCSS(effectiveColor(stop.color, opacity))} ${stop.position * 100}%`)
    .join(', ')
}

export function fillCategory(fill: Fill): FillCategory {
  return FILL_CATEGORY[fill.type] ?? 'SOLID'
}

export function fillIsTransparent(fill: Fill): boolean {
  if (fill.opacity < 1) return true
  if (fillCategory(fill) === 'GRADIENT')
    return fill.gradientStops?.some((stop) => stop.color.a < 1) ?? fill.color.a < 1
  return fill.color.a < 1
}

export function fillSwatchBackground(fill: Fill): string {
  if (fillCategory(fill) === 'GRADIENT' && fill.gradientStops?.length) {
    return `linear-gradient(to right, ${gradientCSS(fill.gradientStops, fill.opacity)})`
  }
  return colorToCSS(effectiveColor(fill.color, fill.opacity))
}

/** Fill category state and immutable conversion actions without picker or popover behavior. */
export function useFill(fill: Fill, onUpdate: (fill: Fill) => void) {
  const category = useMemo(() => fillCategory(fill), [fill])
  const swatchBackground = useMemo(() => fillSwatchBackground(fill), [fill])
  const transparent = useMemo(() => fillIsTransparent(fill), [fill])

  const toSolid = useCallback(() => {
    if (category === 'SOLID') return
    const color = fill.gradientStops?.[0]?.color ?? fill.color
    onUpdate({ ...fill, type: 'SOLID', color: { ...color } })
  }, [category, fill, onUpdate])

  const toGradient = useCallback(() => {
    if (category === 'GRADIENT') return
    const gradientStops: GradientStop[] = fill.gradientStops?.length
      ? structuredClone(fill.gradientStops)
      : [
          { color: { ...fill.color }, position: 0 },
          { color: { r: 1, g: 1, b: 1, a: 1 }, position: 1 }
        ]
    onUpdate({
      ...fill,
      type: 'GRADIENT_LINEAR',
      gradientStops,
      gradientTransform: { m00: 1, m01: 0, m02: 0, m10: 0, m11: 0, m12: 0.5 }
    })
  }, [category, fill, onUpdate])

  const toImage = useCallback(() => {
    if (category === 'IMAGE') return
    onUpdate({ ...fill, type: 'IMAGE' })
  }, [category, fill, onUpdate])

  const actions = { toSolid, toGradient, toImage }

  return {
    category,
    swatchBackground,
    transparent,
    actions,
    toSolid,
    toGradient,
    toImage
  }
}
