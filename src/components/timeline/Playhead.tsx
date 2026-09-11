import React, { useRef, useCallback } from 'react'

interface PlayheadProps {
  currentTimeMs: number
  durationMs: number
  zoom: number
  trackHeight: number
  onSeek: (timeMs: number) => void
}

export default function Playhead({
  currentTimeMs,
  durationMs,
  zoom,
  trackHeight,
  onSeek
}: PlayheadProps) {
  const handleRef = useRef<HTMLDivElement>(null)
  const isDraggingRef = useRef(false)
  const startXRef = useRef(0)
  const startTimeRef = useRef(0)

  const pxPerMs = 0.45 * zoom
  const leftPx = currentTimeMs * pxPerMs

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
      const deltaTime = deltaX / pxPerMs
      const nextTime = Math.max(0, Math.min(durationMs, startTimeRef.current + deltaTime))
      onSeek(nextTime)
    },
    [durationMs, pxPerMs, onSeek]
  )

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    isDraggingRef.current = false
    try {
      handleRef.current?.releasePointerCapture(e.pointerId)
    } catch {
      // Pointer capture release safeguard
    }
  }, [])

  return (
    <div
      data-test-id="timeline-playhead"
      className="absolute top-0 bottom-0 z-20 pointer-events-none"
      style={{ left: `${leftPx}px` }}
    >
      {/* Draggable Playhead Diamond Handle */}
      <div
        ref={handleRef}
        className="pointer-events-auto absolute -top-0.5 -translate-x-1/2 flex cursor-ew-resize flex-col items-center"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <div className="size-3.5 rotate-45 rounded-[2px] bg-accent shadow-[0_0_8px_rgb(59_130_246/0.6)]" />
      </div>

      {/* Vertical scrubber line spanning the entire timeline */}
      <div
        className="absolute top-0 w-px bg-accent shadow-[0_0_4px_rgb(59_130_246/0.5)] pointer-events-none"
        style={{ height: `${trackHeight}px` }}
      />
    </div>
  )
}
