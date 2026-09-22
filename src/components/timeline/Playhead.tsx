import { useStore } from '@nanostores/react'
import React, { useCallback, useEffect, useRef } from 'react'

import { snapToNearestKeyframe, timelineStore } from '@/app/motion/store'
import { HEADER_WIDTH } from '@/components/timeline/constants'

interface PlayheadProps {
  currentTimeMs?: number
  durationMs: number
  zoom: number
  trackHeight?: number
  onSeek: (timeMs: number) => void
}

export default function Playhead({
  currentTimeMs: propCurrentTimeMs,
  durationMs,
  zoom,
  onSeek
}: PlayheadProps) {
  const storeTime = useStore(timelineStore).currentTimeMs
  const currentTimeMs = propCurrentTimeMs ?? storeTime

  const handleRef = useRef<HTMLDivElement>(null)
  const isDraggingRef = useRef(false)
  const startXRef = useRef(0)
  const startTimeRef = useRef(0)
  const rafRef = useRef<number | null>(null)
  const pendingTimeRef = useRef<number>(currentTimeMs)

  const pxPerMs = 0.45 * zoom
  const leftPx = HEADER_WIDTH + currentTimeMs * pxPerMs

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
      }
    }
  }, [])

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
      const targetTime = isOverride
        ? rawTime
        : snapToNearestKeyframe(rawTime, Math.max(10, 10 / pxPerMs))

      pendingTimeRef.current = targetTime
      if (rafRef.current === null) {
        rafRef.current = requestAnimationFrame(() => {
          rafRef.current = null
          onSeek(pendingTimeRef.current)
        })
      }
    },
    [durationMs, pxPerMs, onSeek]
  )

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (isDraggingRef.current) {
        isDraggingRef.current = false
        if (rafRef.current !== null) {
          cancelAnimationFrame(rafRef.current)
          rafRef.current = null
          onSeek(pendingTimeRef.current)
        }
        try {
          handleRef.current?.releasePointerCapture(e.pointerId)
        } catch {
          /* safe */
        }
      }
    },
    [onSeek]
  )

  return (
    <div
      data-test-id="timeline-playhead"
      className="absolute top-0 bottom-0 left-0 z-20 pointer-events-none will-change-transform"
      style={{
        transform: `translate3d(${leftPx}px, 0, 0)`
      }}
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
        <div className="size-3 rounded-full bg-accent shadow-[0_0_8px_rgba(59,130,246,0.7)] flex items-center justify-center transition-transform group-hover:scale-125">
          <div className="size-1 rounded-full bg-white" />
        </div>
      </div>

      {/* Vertical hairline */}
      <div className="absolute top-4 bottom-0 w-px bg-accent pointer-events-none" />
    </div>
  )
}
