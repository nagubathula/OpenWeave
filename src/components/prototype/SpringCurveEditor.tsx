import { Play, RotateCcw } from 'lucide-react'
import React, { useEffect, useMemo, useRef, useState } from 'react'

import {
  FIGMA_SPRING_PRESETS,
  getSpringSettlingDuration,
  solveSpringDisplacement
} from '@openweave/core/editor'
import { useI18n } from '@openweave/react'
import type { SpringConfig, SpringPreset } from '@openweave/scene-graph'

import NumberField from '@/components/inputs/NumberField'
import Tip from '@/components/ui/Tip'

export interface SpringCurveEditorProps {
  preset?: SpringPreset
  config?: SpringConfig
  onPresetChange: (preset: SpringPreset) => void
  onConfigChange: (config: SpringConfig) => void
  onDurationSuggest?: (durationMs: number) => void
}

const PRESET_OPTIONS: Array<{ value: SpringPreset; label: string }> = [
  { value: 'BOUNCY', label: 'Bouncy' },
  { value: 'GENTLE', label: 'Gentle' },
  { value: 'QUICK', label: 'Quick' },
  { value: 'SLOW', label: 'Slow' },
  { value: 'CUSTOM', label: 'Custom' }
]

export default function SpringCurveEditor({
  preset = 'BOUNCY',
  config,
  onPresetChange,
  onConfigChange,
  onDurationSuggest
}: SpringCurveEditorProps) {
  const { panels } = useI18n()
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  const activeConfig: SpringConfig = useMemo(() => {
    if (config) return config
    if (preset in FIGMA_SPRING_PRESETS) {
      return FIGMA_SPRING_PRESETS[preset as keyof typeof FIGMA_SPRING_PRESETS]
    }
    return FIGMA_SPRING_PRESETS.BOUNCY
  }, [config, preset])

  const settlingDurationMs = useMemo(() => getSpringSettlingDuration(activeConfig), [activeConfig])

  const [animating, setAnimating] = useState(false)
  const [animProgress, setAnimProgress] = useState(1)

  // Trigger preview bounce
  const triggerPreview = () => {
    setAnimating(true)
    const startTime = performance.now()
    const duration = settlingDurationMs

    const frame = (now: number) => {
      const elapsed = now - startTime
      const p = Math.min(1, elapsed / duration)
      setAnimProgress(p)
      if (p < 1) {
        requestAnimationFrame(frame)
      } else {
        setAnimating(false)
        setAnimProgress(1)
      }
    }
    requestAnimationFrame(frame)
  }

  // Auto trigger preview when preset or config changes
  useEffect(() => {
    triggerPreview()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preset, activeConfig.stiffness, activeConfig.damping, activeConfig.mass])

  // Canvas curve geometry
  const width = 240
  const height = 90
  const padLeft = 14
  const padRight = 14
  const padBottom = 16
  const padTop = 18

  const graphW = width - padLeft - padRight
  const graphH = height - padTop - padBottom

  const baselineY = height - padBottom
  const targetY = padTop + graphH * 0.35
  const scaleY = baselineY - targetY

  // Preview ball position
  const currentDisplacement = useMemo(() => {
    const durationSec = settlingDurationMs / 1000
    return solveSpringDisplacement(activeConfig, animProgress * durationSec)
  }, [activeConfig, animProgress, settlingDurationMs])

  const ballX = padLeft + animProgress * graphW
  const ballY = baselineY - currentDisplacement * scaleY

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1
    const w = width
    const h = height
    canvas.width = w * dpr
    canvas.height = h * dpr
    ctx.scale(dpr, dpr)

    ctx.clearRect(0, 0, w, h)

    // Baseline y=0
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(padLeft, baselineY)
    ctx.lineTo(w - padRight, baselineY)
    ctx.stroke()

    // Target line y=1 (dashed)
    ctx.strokeStyle = 'rgba(99, 102, 241, 0.4)'
    ctx.setLineDash([3, 3])
    ctx.beginPath()
    ctx.moveTo(padLeft, targetY)
    ctx.lineTo(w - padRight, targetY)
    ctx.stroke()
    ctx.setLineDash([])

    // Spring curve
    ctx.strokeStyle = 'rgb(99, 102, 241)'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.beginPath()

    const sampleCount = 60
    const durationSec = settlingDurationMs / 1000
    for (let i = 0; i <= sampleCount; i++) {
      const tNorm = i / sampleCount
      const tSec = tNorm * durationSec
      const yNorm = solveSpringDisplacement(activeConfig, tSec)
      const px = padLeft + tNorm * graphW
      const py = baselineY - yNorm * scaleY
      if (i === 0) ctx.moveTo(px, py)
      else ctx.lineTo(px, py)
    }
    ctx.stroke()

    // Preview bouncing ball
    ctx.fillStyle = 'rgb(99, 102, 241)'
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.arc(ballX, ballY, 4, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
  }, [
    activeConfig,
    settlingDurationMs,
    animProgress,
    ballX,
    ballY,
    baselineY,
    graphW,
    height,
    padLeft,
    padRight,
    scaleY,
    targetY,
    width
  ])

  const selectPreset = (newPreset: SpringPreset) => {
    onPresetChange(newPreset)
    if (newPreset in FIGMA_SPRING_PRESETS) {
      const pConfig = FIGMA_SPRING_PRESETS[newPreset as keyof typeof FIGMA_SPRING_PRESETS]
      onConfigChange(pConfig)
      onDurationSuggest?.(getSpringSettlingDuration(pConfig))
    }
  }

  const updateConfig = (patch: Partial<SpringConfig>) => {
    const next: SpringConfig = { ...activeConfig, ...patch }
    onPresetChange('CUSTOM')
    onConfigChange(next)
    onDurationSuggest?.(getSpringSettlingDuration(next))
  }

  return (
    <div className="space-y-2.5 rounded border border-border/80 bg-surface/5 p-2.5">
      {/* Header & Presets */}
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold text-surface">Spring Physics</span>
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-muted">{settlingDurationMs}ms</span>
          <Tip label={panels.prototypeRestart ?? 'Replay'}>
            <button
              type="button"
              aria-label={panels.prototypeRestart ?? 'Replay'}
              className="rounded p-0.5 text-muted hover:bg-hover hover:text-surface"
              onClick={triggerPreview}
            >
              <RotateCcw className="size-3" />
            </button>
          </Tip>
        </div>
      </div>

      {/* Preset pills */}
      <div className="grid grid-cols-5 gap-1">
        {PRESET_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            className={`rounded px-1.5 py-1 text-center text-[10px] font-medium transition-colors ${
              preset === opt.value
                ? 'bg-accent text-white shadow-xs'
                : 'bg-input/60 text-muted hover:bg-hover hover:text-surface'
            }`}
            onClick={() => selectPreset(opt.value)}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Interactive Canvas Curve Graph */}
      <div
        className="relative overflow-hidden rounded border border-border/60 bg-black/20 flex items-center justify-center"
        onMouseEnter={() => !animating && triggerPreview()}
      >
        <canvas ref={canvasRef} className="h-20 w-full" style={{ width: '100%', height: '80px' }} />

        {/* Play indicator */}
        <button
          type="button"
          aria-label={panels.prototypePresent ?? 'Play'}
          className="absolute bottom-1 right-1 rounded bg-surface/10 p-1 text-muted hover:text-white"
          onClick={triggerPreview}
        >
          <Play className="size-2.5 fill-current" />
        </button>
      </div>

      {/* Physics Sliders (for Custom or fine-tuning) */}
      <div className="grid grid-cols-3 gap-2 pt-1 border-t border-border/40">
        <NumberField
          label="Stiffness"
          value={activeConfig.stiffness}
          min={10}
          max={1200}
          step={10}
          onChange={(stiffness) => updateConfig({ stiffness })}
        />
        <NumberField
          label="Damping"
          value={activeConfig.damping}
          min={1}
          max={100}
          step={1}
          onChange={(damping) => updateConfig({ damping })}
        />
        <NumberField
          label="Mass"
          value={activeConfig.mass}
          min={0.1}
          max={5}
          step={0.1}
          onChange={(mass) => updateConfig({ mass })}
        />
      </div>
    </div>
  )
}
