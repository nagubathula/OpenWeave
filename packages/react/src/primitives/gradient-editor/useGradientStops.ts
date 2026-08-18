import { useColorModel } from '#react/controls/color-model/use'
import { useState, useMemo, useCallback } from 'react'

import { colorToCSS } from '@openweave/core/color'
import type { Fill, GradientStop, GradientTransform } from '@openweave/scene-graph'
import type { Color } from '@openweave/scene-graph/primitives'

type GradientSubtype =
  | 'GRADIENT_LINEAR'
  | 'GRADIENT_RADIAL'
  | 'GRADIENT_ANGULAR'
  | 'GRADIENT_DIAMOND'

const SUBTYPES: { value: GradientSubtype; label: string }[] = [
  { value: 'GRADIENT_LINEAR', label: 'Linear' },
  { value: 'GRADIENT_RADIAL', label: 'Radial' },
  { value: 'GRADIENT_ANGULAR', label: 'Angular' },
  { value: 'GRADIENT_DIAMOND', label: 'Diamond' }
]

const DEFAULT_TRANSFORMS: Record<GradientSubtype, GradientTransform> = {
  GRADIENT_LINEAR: { m00: 1, m01: 0, m02: 0, m10: 0, m11: 0, m12: 0.5 },
  GRADIENT_RADIAL: { m00: 0.5, m01: 0, m02: 0.5, m10: 0, m11: 0.5, m12: 0.5 },
  GRADIENT_ANGULAR: { m00: 0.5, m01: 0, m02: 0.5, m10: 0, m11: 0.5, m12: 0.5 },
  GRADIENT_DIAMOND: { m00: 0.5, m01: 0, m02: 0.5, m10: 0, m11: 0.5, m12: 0.5 }
}

export function useGradientStops(fill: Fill, onUpdate: (fill: Fill) => void) {
  const [activeStopIndex, setActiveStopIndex] = useState(0)

  const stops = useMemo(() => fill.gradientStops ?? [], [fill.gradientStops])
  const subtype = useMemo(() => fill.type as GradientSubtype, [fill.type])

  const activeColor = useMemo(() => {
    if (!stops.length) return fill.color as Color
    return stops[Math.min(activeStopIndex, stops.length - 1)].color
  }, [stops, activeStopIndex, fill.color])

  const barBackground = useMemo(() => {
    return stops.length
      ? `linear-gradient(to right, ${stops.map((s) => `${colorToCSS(s.color)} ${s.position * 100}%`).join(', ')})`
      : ''
  }, [stops])

  const emitStops = useCallback(
    (newStops: GradientStop[]) => {
      onUpdate({ ...fill, gradientStops: newStops })
    },
    [fill, onUpdate]
  )

  const setSubtype = useCallback(
    (type: GradientSubtype) => {
      if (type === fill.type) return
      onUpdate({ ...fill, type, gradientTransform: DEFAULT_TRANSFORMS[type] })
    },
    [fill, onUpdate]
  )

  const selectStop = useCallback((index: number) => {
    setActiveStopIndex(index)
  }, [])

  const addStop = useCallback(() => {
    const s = [...stops]
    const pos = s.length >= 2 ? (s[s.length - 2].position + s[s.length - 1].position) / 2 : 0.5
    s.push({ color: { ...activeColor }, position: pos })
    s.sort((a, b) => a.position - b.position)
    setActiveStopIndex(s.findIndex((stop) => stop.position === pos))
    emitStops(s)
  }, [stops, activeColor, emitStops])

  const removeStop = useCallback(
    (index: number) => {
      if (stops.length <= 2) return
      emitStops(stops.filter((_, i) => i !== index))
      setActiveStopIndex(Math.min(activeStopIndex, stops.length - 2))
    },
    [stops, activeStopIndex, emitStops]
  )

  const updateStopPosition = useCallback(
    (index: number, position: number) => {
      const s = [...stops]
      s[index] = { ...s[index], position: Math.max(0, Math.min(1, position / 100)) }
      emitStops(s)
    },
    [stops, emitStops]
  )

  const updateActiveColor = useCallback(
    (color: Color) => {
      const s = [...stops]
      const idx = Math.min(activeStopIndex, s.length - 1)
      s[idx] = { ...s[idx], color }
      emitStops(s)
    },
    [stops, activeStopIndex, emitStops]
  )

  const colorModel = useColorModel({
    color: activeColor,
    onUpdate: updateActiveColor
  })

  const updateStopColor = useCallback(
    (index: number, hex: string) => {
      selectStop(index)
      colorModel.updateHex(hex)
    },
    [selectStop, colorModel]
  )

  const updateStopOpacity = useCallback(
    (index: number, opacity: number) => {
      const s = [...stops]
      s[index] = {
        ...s[index],
        color: { ...s[index].color, a: Math.max(0, Math.min(1, opacity / 100)) }
      }
      emitStops(s)
    },
    [stops, emitStops]
  )

  const dragStop = useCallback(
    (index: number, position: number) => {
      const s = [...stops]
      s[index] = { ...s[index], position }
      emitStops(s)
    },
    [stops, emitStops]
  )

  return {
    activeStopIndex,
    stops,
    subtype,
    subtypes: SUBTYPES,
    activeColor,
    barBackground,
    setSubtype,
    selectStop,
    addStop,
    removeStop,
    updateStopPosition,
    updateStopColor,
    updateStopOpacity,
    updateActiveColor,
    dragStop
  }
}
