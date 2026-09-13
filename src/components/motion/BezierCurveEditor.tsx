import { Play, RotateCcw } from 'lucide-react'
import React, { useEffect, useRef, useState } from 'react'

import Tip from '@/components/ui/Tip'

export interface BezierPoints {
  x1: number
  y1: number
  x2: number
  y2: number
}

interface BezierCurveEditorProps {
  points?: BezierPoints
  onChange?: (points: BezierPoints) => void
}

const PRESETS: { label: string; points: BezierPoints }[] = [
  { label: 'Ease In-Out', points: { x1: 0.42, y1: 0, x2: 0.58, y2: 1 } },
  { label: 'Ease Out', points: { x1: 0, y1: 0, x2: 0.58, y2: 1 } },
  { label: 'Ease In', points: { x1: 0.42, y1: 0, x2: 1, y2: 1 } },
  { label: 'Linear', points: { x1: 0, y1: 0, x2: 1, y2: 1 } },
  { label: 'Snappy', points: { x1: 0.1, y1: 0.9, x2: 0.2, y2: 1 } },
  { label: 'Overshoot', points: { x1: 0.34, y1: 1.4, x2: 0.64, y2: 1 } }
]

export default function BezierCurveEditor({
  points = { x1: 0.42, y1: 0, x2: 0.58, y2: 1 },
  onChange
}: BezierCurveEditorProps) {
  const [activeHandle, setActiveHandle] = useState<'p1' | 'p2' | null>(null)
  const [previewT, setPreviewT] = useState(1)
  const [isPlaying, setIsPlaying] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  const width = 220
  const height = 90
  const padX = 22
  const padY = 16
  const plotW = width - padX * 2
  const plotH = height - padY * 2

  const toCanvas = (x: number, y: number) => ({
    x: padX + x * plotW,
    y: height - padY - y * plotH
  })

  const fromCanvas = (cx: number, cy: number) => ({
    x: Math.max(0, Math.min(1, Math.round(((cx - padX) / plotW) * 100) / 100)),
    y: Math.round(((height - padY - cy) / plotH) * 100) / 100
  })

  const p0 = toCanvas(0, 0)
  const p1 = toCanvas(points.x1, points.y1)
  const p2 = toCanvas(points.x2, points.y2)
  const p3 = toCanvas(1, 1)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1
    canvas.width = width * dpr
    canvas.height = height * dpr
    ctx.scale(dpr, dpr)

    ctx.clearRect(0, 0, width, height)

    // Draw grid bounds
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)'
    ctx.lineWidth = 1
    ctx.setLineDash([2, 2])
    ctx.strokeRect(padX, padY, plotW, plotH)
    ctx.setLineDash([])

    // Guide lines to control points
    ctx.strokeStyle = 'rgba(59, 130, 246, 0.4)'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(p0.x, p0.y)
    ctx.lineTo(p1.x, p1.y)
    ctx.moveTo(p3.x, p3.y)
    ctx.lineTo(p2.x, p2.y)
    ctx.stroke()

    // Cubic Bezier curve
    ctx.strokeStyle = '#3b82f6'
    ctx.lineWidth = 2.5
    ctx.beginPath()
    ctx.moveTo(p0.x, p0.y)
    ctx.bezierCurveTo(p1.x, p1.y, p2.x, p2.y, p3.x, p3.y)
    ctx.stroke()

    // End points
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)'
    ctx.beginPath()
    ctx.arc(p0.x, p0.y, 3, 0, Math.PI * 2)
    ctx.arc(p3.x, p3.y, 3, 0, Math.PI * 2)
    ctx.fill()

    // Control Handles P1 & P2
    ctx.fillStyle = '#3b82f6'
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 1.5

    ctx.beginPath()
    ctx.arc(p1.x, p1.y, 5, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()

    ctx.beginPath()
    ctx.arc(p2.x, p2.y, 5, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
  }, [points.x1, points.y1, points.x2, points.y2, p0.x, p0.y, p1.x, p1.y, p2.x, p2.y, p3.x, p3.y])

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top

    const distP1 = Math.hypot(mouseX - p1.x, mouseY - p1.y)
    const distP2 = Math.hypot(mouseX - p2.x, mouseY - p2.y)

    if (distP1 <= 14) {
      setActiveHandle('p1')
      e.currentTarget.setPointerCapture(e.pointerId)
    } else if (distP2 <= 14) {
      setActiveHandle('p2')
      e.currentTarget.setPointerCapture(e.pointerId)
    }
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!activeHandle || !canvasRef.current) return
    const rect = canvasRef.current.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top
    const { x, y } = fromCanvas(mouseX, mouseY)

    if (activeHandle === 'p1') {
      onChange?.({ ...points, x1: x, y1: y })
    } else {
      onChange?.({ ...points, x2: x, y2: y })
    }
  }

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (activeHandle) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId)
      } catch {
        // Safe release
      }
      setActiveHandle(null)
    }
  }

  const runPreview = () => {
    if (isPlaying) return
    setIsPlaying(true)
    setPreviewT(0)
    const startTime = performance.now()
    const duration = 600

    const step = (now: number) => {
      const elapsed = now - startTime
      const t = Math.min(1, elapsed / duration)
      // Cubic bezier evaluation approximation
      const easeT = 3 * (1 - t) ** 2 * t * points.y1 + 3 * (1 - t) * t ** 2 * points.y2 + t ** 3
      setPreviewT(easeT)

      if (t < 1) {
        requestAnimationFrame(step)
      } else {
        setIsPlaying(false)
      }
    }
    requestAnimationFrame(step)
  }

  return (
    <div className="flex flex-col gap-2 rounded-md border border-border/40 bg-background/30 p-2 text-xs">
      {/* Quick Presets row */}
      <div className="flex flex-wrap gap-1">
        {PRESETS.map((preset) => {
          const isActive =
            points.x1 === preset.points.x1 &&
            points.y1 === preset.points.y1 &&
            points.x2 === preset.points.x2 &&
            points.y2 === preset.points.y2
          return (
            <button
              key={preset.label}
              type="button"
              className={`rounded px-1.5 py-0.5 text-[10px] transition-colors cursor-pointer ${
                isActive
                  ? 'bg-accent text-white font-medium'
                  : 'bg-panel/80 text-muted hover:bg-hover hover:text-surface'
              }`}
              onClick={() => onChange?.(preset.points)}
            >
              {preset.label}
            </button>
          )
        })}
      </div>

      {/* Canvas Bezier Editor */}
      <div className="relative flex items-center justify-center rounded border border-border/30 bg-panel/70 p-1">
        <canvas
          ref={canvasRef}
          style={{ width: `${width}px`, height: `${height}px` }}
          className="select-none cursor-crosshair touch-none"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        />

        {/* Live preview track at the bottom */}
        <div className="absolute bottom-1 left-2 right-2 flex items-center gap-1.5 bg-panel/90 px-1.5 py-0.5 rounded border border-border/30">
          {/* oxlint-disable-next-line openweave/no-hardcoded-tip-labels */}
          <Tip label="Preview curve speed">
            <button
              type="button"
              className="flex size-4 items-center justify-center rounded text-muted hover:text-accent cursor-pointer"
              onClick={runPreview}
            >
              <Play className="size-2.5 fill-current" />
            </button>
          </Tip>

          <div className="relative flex-1 h-1.5 rounded-full bg-border/40 overflow-hidden">
            <div
              className="absolute top-0 bottom-0 w-2 rounded-full bg-accent transition-all duration-75"
              style={{ left: `calc(${Math.min(100, Math.max(0, previewT * 100))}% - 4px)` }}
            />
          </div>

          {/* oxlint-disable-next-line openweave/no-hardcoded-tip-labels */}
          <Tip label="Reset to Ease In-Out">
            <button
              type="button"
              className="flex size-4 items-center justify-center rounded text-muted hover:text-surface cursor-pointer"
              onClick={() => onChange?.({ x1: 0.42, y1: 0, x2: 0.58, y2: 1 })}
            >
              <RotateCcw className="size-2.5" />
            </button>
          </Tip>
        </div>
      </div>

      {/* Cubic-bezier CSS text */}
      <div className="font-mono text-[10px] text-muted text-center">
        cubic-bezier({points.x1}, {points.y1}, {points.x2}, {points.y2})
      </div>
    </div>
  )
}
