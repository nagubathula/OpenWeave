import { useStore } from '@nanostores/react'
import { Pause, Play, Repeat, X } from 'lucide-react'
import React, { useCallback, useRef } from 'react'

import {
  setLoop,
  snapToNearestKeyframe,
  setZoom,
  timelineStore,
  togglePlay
} from '@/app/motion/store'
import { HEADER_WIDTH } from '@/components/timeline/constants'
import Tip from '@/components/ui/Tip'

interface RulerProps {
  durationMs: number
  zoom: number
  scrollLeft: number
  onSeek: (timeMs: number) => void
  onClose?: () => void
}

export default function Ruler({ durationMs, zoom, onSeek, onClose }: RulerProps) {
  const { isPlaying, currentTimeMs, loop } = useStore(timelineStore)
  const ticksContainerRef = useRef<HTMLDivElement>(null)
  const isDraggingRef = useRef(false)

  const safeDurationMs = Math.max(100, Math.min(60000, Number(durationMs) || 2000))
  const safeZoom = Math.max(0.1, Math.min(5, Number(zoom) || 1))
  const pxPerMs = 0.45 * safeZoom
  const totalWidth = Math.max(800, safeDurationMs * pxPerMs + 100)

  // Dynamically scale intervals with zoom to prevent massive tick arrays
  const majorIntervalMs = pxPerMs < 0.2 ? 1000 : pxPerMs < 0.5 ? 500 : 200
  const minorIntervalMs = majorIntervalMs / 2

  const majorTicks: number[] = []
  for (let t = 0; t <= safeDurationMs + majorIntervalMs; t += majorIntervalMs) {
    majorTicks.push(t)
    if (majorTicks.length >= 200) break
  }

  const minorTicks: number[] = []
  for (let t = 0; t <= safeDurationMs + majorIntervalMs; t += minorIntervalMs) {
    if (t % majorIntervalMs !== 0) minorTicks.push(t)
    if (minorTicks.length >= 400) break
  }

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!ticksContainerRef.current) return
      isDraggingRef.current = true
      ticksContainerRef.current.setPointerCapture(e.pointerId)
      const rect = ticksContainerRef.current.getBoundingClientRect()
      const clickX = e.clientX - rect.left
      const rawTime = Math.max(0, Math.min(durationMs, clickX / pxPerMs))
      const isOverride = e.shiftKey || e.metaKey || e.ctrlKey
      const timeMs = isOverride
        ? rawTime
        : snapToNearestKeyframe(rawTime, Math.max(10, 10 / pxPerMs))
      onSeek(timeMs)
    },
    [durationMs, pxPerMs, onSeek]
  )

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isDraggingRef.current || !ticksContainerRef.current) return
      const rect = ticksContainerRef.current.getBoundingClientRect()
      const clickX = e.clientX - rect.left
      const rawTime = Math.max(0, Math.min(durationMs, clickX / pxPerMs))
      const isOverride = e.shiftKey || e.metaKey || e.ctrlKey
      const timeMs = isOverride
        ? rawTime
        : snapToNearestKeyframe(rawTime, Math.max(10, 10 / pxPerMs))
      onSeek(timeMs)
    },
    [durationMs, pxPerMs, onSeek]
  )

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    isDraggingRef.current = false
    try {
      ticksContainerRef.current?.releasePointerCapture(e.pointerId)
    } catch {
      /* safe */
    }
  }, [])

  return (
    <div
      data-test-id="timeline-ruler"
      className="flex h-8 shrink-0 select-none border-b border-white/10 bg-[#1e1e20] relative"
      style={{ width: `${HEADER_WIDTH + totalWidth}px` }}
    >
      {/* Sticky left header: Figma Motion transport bar */}
      <div
        className="sticky left-0 z-20 flex h-full shrink-0 items-center justify-between border-r border-white/10 bg-[#1e1e20] px-2.5"
        style={{ width: `${HEADER_WIDTH}px` }}
      >
        <div className="flex items-center gap-1.5">
          {/* Play/Pause */}
          {/* oxlint-disable-next-line openweave/no-hardcoded-tip-labels */}
          <Tip label={isPlaying ? 'Pause (Space)' : 'Play (Space)'}>
            <button
              type="button"
              data-test-id="timeline-play-button"
              aria-label={isPlaying ? 'Pause' : 'Play'}
              className="flex size-6 cursor-pointer items-center justify-center rounded text-white/80 hover:bg-white/10 hover:text-white transition-colors"
              onClick={togglePlay}
            >
              {isPlaying ? (
                <Pause className="size-3 fill-current" />
              ) : (
                <Play className="size-3 fill-current ml-0.5" />
              )}
            </button>
          </Tip>

          {/* Timecode pill: 1206 2000 ms 🔁 */}
          <div
            data-test-id="timeline-timecode-pill"
            className="flex items-center gap-1.5 rounded-full border border-white/15 bg-[#2c2c2e] px-2.5 py-0.5 text-[11px] font-mono font-medium text-white shadow-xs"
          >
            <span className="font-semibold text-white">{Math.round(currentTimeMs)}</span>
            <span className="text-white/60">{Math.round(durationMs)} ms</span>
            <button
              type="button"
              aria-label="Toggle loop"
              className={`cursor-pointer transition-colors ${loop ? 'text-[#0d99ff]' : 'text-white/30 hover:text-white/60'}`}
              onClick={() => setLoop(!loop)}
            >
              <Repeat className="size-2.5" />
            </button>
          </div>
        </div>

        {/* Collapse button */}
        {onClose && (
          /* oxlint-disable-next-line openweave/no-hardcoded-tip-labels */
          <Tip label="Collapse timeline">
            <button
              type="button"
              data-test-id="timeline-collapse-button"
              aria-label="Collapse timeline"
              className="flex size-5 cursor-pointer items-center justify-center rounded text-white/40 hover:bg-white/10 hover:text-white transition-colors"
              onClick={onClose}
            >
              <X className="size-3" />
            </button>
          </Tip>
        )}
      </div>

      {/* Ticks area */}
      <div
        ref={ticksContainerRef}
        className="relative h-full cursor-col-resize"
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
            className="absolute bottom-0 h-[5px] w-px bg-white/[0.08] pointer-events-none"
            style={{ left: `${t * pxPerMs}px` }}
          />
        ))}

        {/* Major ticks + labels */}
        {majorTicks.map((t) => (
          <div
            key={`maj-${t}`}
            className="absolute bottom-0 flex flex-col items-start pointer-events-none"
            style={{ left: `${t * pxPerMs}px` }}
          >
            <span className="text-[9px] font-mono text-white/40 leading-none mb-1 -translate-x-1/2">
              {t}
            </span>
            <div className="h-[7px] w-px bg-white/20" />
          </div>
        ))}
      </div>

      {/* Sticky right zoom slider matching Figma Motion screenshot */}
      <div
        className="sticky right-3 z-20 flex items-center gap-1.5 h-full self-center pl-2 bg-[#1e1e20]/80 backdrop-blur-sm"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <input
          type="range"
          min={0.4}
          max={2.5}
          step={0.1}
          value={zoom}
          aria-label="Timeline zoom"
          className="h-1 w-16 cursor-pointer accent-[#0d99ff]"
          onChange={(e) => setZoom(parseFloat(e.target.value))}
        />
      </div>
    </div>
  )
}
