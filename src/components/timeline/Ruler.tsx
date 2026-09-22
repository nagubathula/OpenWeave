import { useStore } from '@nanostores/react'
import { Pause, Play, Repeat, X } from 'lucide-react'
import React, { useCallback, useEffect, useMemo, useRef } from 'react'

import { setLoop, snapToNearestKeyframe, timelineStore, togglePlay } from '@/app/motion/store'
import { HEADER_WIDTH } from '@/components/timeline/constants'
import Tip from '@/components/ui/Tip'

interface RulerProps {
  durationMs: number
  zoom: number
  scrollLeft: number
  onSeek: (timeMs: number) => void
  onClose?: () => void
}

function TimecodePill({ durationMs }: { durationMs: number }) {
  const { currentTimeMs, loop } = useStore(timelineStore)

  return (
    <div
      data-test-id="timeline-timecode-pill"
      className="flex items-center gap-1.5 rounded-full border border-border bg-panel-field px-2.5 py-0.5 text-[11px] font-mono font-medium text-surface shadow-xs"
    >
      <span className="font-semibold text-surface">{Math.round(currentTimeMs)}</span>
      <span className="text-muted">{Math.round(durationMs)} ms</span>
      <button
        type="button"
        aria-label="Toggle loop"
        className={`cursor-pointer transition-colors ${loop ? 'text-accent' : 'text-muted hover:text-surface'}`}
        onClick={() => setLoop(!loop)}
      >
        <Repeat className="size-2.5" />
      </button>
    </div>
  )
}

const CANDIDATE_INTERVALS = [10, 25, 50, 100, 200, 500, 1000, 2000, 5000, 10000]

function getAdaptiveMajorInterval(pxPerMs: number): number {
  for (const interval of CANDIDATE_INTERVALS) {
    if (interval * pxPerMs >= 70) {
      return interval
    }
  }
  return 10000
}

export default function Ruler({ durationMs, zoom, onSeek, onClose }: RulerProps) {
  const { isPlaying } = useStore(timelineStore)
  const ticksContainerRef = useRef<HTMLDivElement>(null)
  const isDraggingRef = useRef(false)
  const rafRef = useRef<number | null>(null)
  const pendingTimeRef = useRef<number>(0)

  const safeDurationMs = Math.max(100, Math.min(60000, Number(durationMs) || 2000))
  const safeZoom = Math.max(0.1, Math.min(5, Number(zoom) || 1))
  const pxPerMs = 0.45 * safeZoom
  const contentWidth = Math.max(800, safeDurationMs * pxPerMs + 100)

  // Dynamically scale intervals with zoom so major ticks are spaced ~70px-140px apart
  const majorIntervalMs = getAdaptiveMajorInterval(pxPerMs)
  const minorIntervalMs = majorIntervalMs % 2 === 0 ? majorIntervalMs / 2 : majorIntervalMs / 5

  const { majorTicks, minorTicks } = useMemo(() => {
    const majors: number[] = []
    for (let t = 0; t <= safeDurationMs + majorIntervalMs * 2; t += majorIntervalMs) {
      majors.push(t)
      if (majors.length >= 250) break
    }

    const minors: number[] = []
    for (let t = 0; t <= safeDurationMs + majorIntervalMs * 2; t += minorIntervalMs) {
      if (t % majorIntervalMs !== 0) minors.push(t)
      if (minors.length >= 500) break
    }

    return { majorTicks: majors, minorTicks: minors }
  }, [safeDurationMs, majorIntervalMs, minorIntervalMs])

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
      }
    }
  }, [])

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
      pendingTimeRef.current = timeMs
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

      pendingTimeRef.current = timeMs
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
          ticksContainerRef.current?.releasePointerCapture(e.pointerId)
        } catch {
          /* safe */
        }
      }
    },
    [onSeek]
  )

  const ticksContent = useMemo(
    () => (
      <>
        {/* Minor ticks */}
        {minorTicks.map((t) => (
          <div
            key={`min-${t}`}
            className="absolute bottom-0 h-[5px] w-px bg-border/60 pointer-events-none"
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
            <span className="text-[9px] font-mono text-muted leading-none mb-1 -translate-x-1/2">
              {t}
            </span>
            <div className="h-[7px] w-px bg-border" />
          </div>
        ))}
      </>
    ),
    [minorTicks, majorTicks, pxPerMs]
  )

  return (
    <div
      data-test-id="timeline-ruler"
      className="flex h-8 shrink-0 select-none border-b border-border bg-panel relative"
      style={{ width: `max(100%, ${HEADER_WIDTH + contentWidth}px)` }}
    >
      {/* Sticky left header: Figma Motion transport bar */}
      <div
        className="sticky left-0 z-20 flex h-full shrink-0 items-center justify-between border-r border-border bg-panel px-2.5"
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
              className="flex size-6 cursor-pointer items-center justify-center rounded text-surface/80 hover:bg-hover hover:text-surface transition-colors"
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
          <TimecodePill durationMs={durationMs} />
        </div>

        {/* Collapse button */}
        {onClose && (
          /* oxlint-disable-next-line openweave/no-hardcoded-tip-labels */
          <Tip label="Collapse timeline">
            <button
              type="button"
              data-test-id="timeline-collapse-button"
              aria-label="Collapse timeline"
              className="flex size-5 cursor-pointer items-center justify-center rounded text-muted hover:bg-hover hover:text-surface transition-colors"
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
        className="relative h-full cursor-col-resize flex-1"
        style={{ minWidth: `${contentWidth}px` }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {ticksContent}

        {/* End of sequence marker line */}
        <div
          className="absolute top-0 bottom-0 pointer-events-none z-10 flex flex-col items-center"
          style={{ left: `${safeDurationMs * pxPerMs}px` }}
        >
          <div className="h-full w-px bg-accent/50" />
        </div>
      </div>
    </div>
  )
}
