import React, { useCallback, useRef } from 'react'

import { snapToNearestKeyframe } from '@/app/motion/store'
import { HEADER_WIDTH } from '@/components/timeline/constants'

interface PlayheadProps {
  currentTimeMs: number
  durationMs: number
  zoom: number
  trackHeight?: number
  onSeek: (timeMs: number) => void
}

export default function Playhead({ currentTimeMs, durationMs, zoom, onSeek }: PlayheadProps) {
  const handleRef = useRef<HTMLDivElement>(null)
  const isDraggingRef = useRef(false)
  const startXRef = useRef(0)
  const startTimeRef = useRef(0)

  const pxPerMs = 0.45 * zoom
  const leftPx = HEADER_WIDTH + currentTimeMs * pxPerMs

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.stopPropagation()
      isDraggingRef.current = true
      startXRef.current = e.clientX
      startTimeRef.current = currentTimeMs
      handleRef.current?.setPointerCapture(e.pointerId)
    },
    [currentTimeMs]
  )

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isDraggingRef.current) return
      const deltaX = e.clientX - startXRef.current
      const rawTime = Math.max(0, Math.min(durationMs, startTimeRef.current + deltaX / pxPerMs))
      const isOverride = e.shiftKey || e.metaKey || e.ctrlKey
      onSeek(isOverride ? rawTime : snapToNearestKeyframe(rawTime, Math.max(10, 10 / pxPerMs)))
    },
    [durationMs, pxPerMs, onSeek]
  )

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    isDraggingRef.current = false
    try {
      handleRef.current?.releasePointerCapture(e.pointerId)
    } catch {
      /* safe */
    }
  }, [])

  return (
    <div
      data-test-id="timeline-playhead"
      className="absolute top-0 bottom-0 z-20 pointer-events-none"
      style={{ left: `${leftPx}px` }}
    >
      {/* Draggable circular blue handle on ruler */}
      <div
        ref={handleRef}
        className="pointer-events-auto absolute top-0.5 -translate-x-1/2 flex flex-col items-center cursor-ew-resize group"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <div className="size-3 rounded-full bg-[#0d99ff] shadow-[0_0_8px_rgba(13,153,255,0.7)] flex items-center justify-center transition-transform group-hover:scale-125">
          <div className="size-1 rounded-full bg-white" />
        </div>
      </div>

      {/* Vertical hairline */}
      <div className="absolute top-4 bottom-0 w-px bg-[#0d99ff] pointer-events-none" />
    </div>
  )
}
