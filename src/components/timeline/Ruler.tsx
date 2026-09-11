import React, { useRef, useCallback } from 'react'

interface RulerProps {
  durationMs: number
  zoom: number
  scrollLeft: number
  onSeek: (timeMs: number) => void
}

export default function Ruler({ durationMs, zoom, onSeek }: RulerProps) {
  const rulerRef = useRef<HTMLDivElement>(null)
  const isDraggingRef = useRef(false)

  const pxPerMs = 0.45 * zoom
  const totalWidth = Math.max(800, durationMs * pxPerMs + 100)

  const majorIntervalMs = 200
  const minorIntervalMs = 50

  const majorTicks: number[] = []
  for (let t = 0; t <= durationMs; t += majorIntervalMs) {
    majorTicks.push(t)
  }

  const minorTicks: number[] = []
  for (let t = 0; t <= durationMs; t += minorIntervalMs) {
    if (t % majorIntervalMs !== 0) {
      minorTicks.push(t)
    }
  }

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!rulerRef.current) return
      isDraggingRef.current = true
      rulerRef.current.setPointerCapture(e.pointerId)

      const rect = rulerRef.current.getBoundingClientRect()
      const clickX = e.clientX - rect.left
      const timeMs = Math.max(0, Math.min(durationMs, clickX / pxPerMs))
      onSeek(timeMs)
    },
    [durationMs, pxPerMs, onSeek]
  )

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isDraggingRef.current || !rulerRef.current) return
      const rect = rulerRef.current.getBoundingClientRect()
      const clickX = e.clientX - rect.left
      const timeMs = Math.max(0, Math.min(durationMs, clickX / pxPerMs))
      onSeek(timeMs)
    },
    [durationMs, pxPerMs, onSeek]
  )

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    isDraggingRef.current = false
    try {
      rulerRef.current?.releasePointerCapture(e.pointerId)
    } catch {
      // Pointer capture might have already been released
    }
  }, [])

  return (
    <div
      ref={rulerRef}
      data-test-id="timeline-ruler"
      className="relative h-7 select-none cursor-pointer border-b border-border/40 bg-panel/90"
      style={{ width: `${totalWidth}px` }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {/* Minor ticks */}
      {minorTicks.map((t) => (
        <div
          key={`min-${t}`}
          className="absolute bottom-0 h-1.5 w-px bg-border/40 pointer-events-none"
          style={{ left: `${t * pxPerMs}px` }}
        />
      ))}

      {/* Major ticks and numbers */}
      {majorTicks.map((t) => (
        <div
          key={`maj-${t}`}
          className="absolute bottom-0 flex flex-col items-center pointer-events-none -translate-x-1/2"
          style={{ left: `${t * pxPerMs}px` }}
        >
          <span className="text-[10px] font-mono text-muted/80 leading-none mb-1">{t}</span>
          <div className="h-2 w-px bg-border/80" />
        </div>
      ))}
    </div>
  )
}
