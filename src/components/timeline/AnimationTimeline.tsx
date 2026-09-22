import { useStore } from '@nanostores/react'
import { Maximize2, Minus, Plus } from 'lucide-react'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useEventListener } from 'usehooks-ts'

import { useAIChat } from '@/app/ai/chat/use'
import { getActiveEditorStoreOrNull } from '@/app/editor/active-store'
import {
  addKeyframe,
  deleteSelectedKeyframes,
  duplicateSelectedKeyframes,
  jumpToNextKeyframe,
  jumpToPreviousKeyframe,
  nodeTracksStore,
  seek,
  selectAllKeyframes,
  selectKeyframe,
  setTimelineHeight,
  setZoom,
  timelineHeightStore,
  timelineStore,
  togglePlay
} from '@/app/motion/store'
import type { AnimatableProperty } from '@/app/motion/types'
import { HEADER_WIDTH } from '@/components/timeline/constants'
import EmptyState from '@/components/timeline/EmptyState'
import Playhead from '@/components/timeline/Playhead'
import Ruler from '@/components/timeline/Ruler'
import TrackList from '@/components/timeline/TrackList'
import Tip from '@/components/ui/Tip'

const MIN_TIMELINE_HEIGHT = 180

export default function AnimationTimeline() {
  const { activeTab } = useAIChat()
  const { durationMs, zoom } = useStore(timelineStore)
  const tracks = useStore(nodeTracksStore)
  const timelineHeight = useStore(timelineHeightStore)
  const [scrollLeft, setScrollLeft] = useState(0)
  const [emptyDismissed, setEmptyDismissed] = useState(false)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  const isResizingRef = useRef(false)
  const resizeStartYRef = useRef(0)
  const resizeStartHeightRef = useRef(0)

  const handleResizeStart = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault()
    isResizingRef.current = true
    resizeStartYRef.current = e.clientY
    resizeStartHeightRef.current = timelineHeight
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const handleResizeMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isResizingRef.current) return
    const deltaY = resizeStartYRef.current - e.clientY
    const maxH = typeof window !== 'undefined' ? Math.min(window.innerHeight * 0.75, 650) : 600
    const nextH = Math.max(
      MIN_TIMELINE_HEIGHT,
      Math.min(maxH, resizeStartHeightRef.current + deltaY)
    )
    setTimelineHeight(nextH)
  }

  const handleResizeEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isResizingRef.current) {
      isResizingRef.current = false
      try {
        e.currentTarget.releasePointerCapture(e.pointerId)
      } catch {
        // Safe release
      }
    }
  }

  const handleResizeDoubleClick = () => {
    // Snap cycle: 220 -> 360 -> 520 -> 220
    let target = 360
    if (timelineHeight < 280) target = 360
    else if (timelineHeight < 440) target = 520
    else target = 220

    setTimelineHeight(target)
  }

  const hasTracks = Object.keys(tracks).length > 0
  const showEmpty = !hasTracks && !emptyDismissed

  useEffect(() => {
    let store = null
    try {
      store = getActiveEditorStoreOrNull()
    } catch {
      return
    }
    if (!store) return

    const unsub = store.onEditorEvent('node:updated', (nodeId: string) => {
      const state = timelineStore.get()
      if (!state.isRecording || state.isPlaying) return

      const node = store?.getNode(nodeId)
      if (!node) return

      const currentTracks = nodeTracksStore.get()
      const nodeTrack = currentTracks[nodeId]

      const animProps: AnimatableProperty[] = [
        'x',
        'y',
        'width',
        'height',
        'rotation',
        'opacity',
        'cornerRadius'
      ]

      for (const prop of animProps) {
        if (prop in node && nodeTrack?.tracks[prop]) {
          const val = (node as unknown as Record<string, number>)[prop]
          if (typeof val === 'number') {
            addKeyframe(nodeId, node.name || 'Layer', prop, val, state.currentTimeMs)
          }
        }
      }
    })

    return unsub
  }, [])

  const applyAnchoredZoom = useCallback((targetZoom: number, anchorClientX?: number) => {
    const el = scrollContainerRef.current
    const currentZoom = timelineStore.get().zoom
    const clampedZoom = Math.max(0.2, Math.min(2.5, targetZoom))
    if (Math.abs(clampedZoom - currentZoom) < 0.001) return

    if (!el) {
      setZoom(Number(clampedZoom.toFixed(2)))
      return
    }

    const currentPxPerMs = 0.45 * currentZoom
    const nextPxPerMs = 0.45 * clampedZoom

    if (anchorClientX !== undefined) {
      const rect = el.getBoundingClientRect()
      const cursorViewportX = anchorClientX - rect.left - HEADER_WIDTH
      const cursorTimelineX = cursorViewportX + el.scrollLeft
      const anchorTimeMs = Math.max(0, cursorTimelineX / currentPxPerMs)
      const nextScrollLeft = Math.max(0, anchorTimeMs * nextPxPerMs - cursorViewportX)
      setZoom(Number(clampedZoom.toFixed(2)))
      el.scrollLeft = nextScrollLeft
    } else {
      const currentTime = timelineStore.get().currentTimeMs
      const playheadTimelineX = currentTime * currentPxPerMs
      const playheadViewportX = playheadTimelineX - el.scrollLeft
      const visibleWidth = el.clientWidth - HEADER_WIDTH

      if (playheadViewportX >= 0 && playheadViewportX <= visibleWidth) {
        const nextScrollLeft = Math.max(0, currentTime * nextPxPerMs - playheadViewportX)
        setZoom(Number(clampedZoom.toFixed(2)))
        el.scrollLeft = nextScrollLeft
      } else {
        const centerViewportX = visibleWidth / 2
        const centerTimeMs = (el.scrollLeft + centerViewportX) / currentPxPerMs
        const nextScrollLeft = Math.max(0, centerTimeMs * nextPxPerMs - centerViewportX)
        setZoom(Number(clampedZoom.toFixed(2)))
        el.scrollLeft = nextScrollLeft
      }
    }
  }, [])

  const handleZoomToFit = useCallback(() => {
    const el = scrollContainerRef.current
    if (!el) return
    const availableWidth = Math.max(300, el.clientWidth - HEADER_WIDTH - 60)
    const idealZoom = Math.max(0.2, Math.min(2.5, availableWidth / (durationMs * 0.45)))
    setZoom(Number(idealZoom.toFixed(2)))
    el.scrollLeft = 0
  }, [durationMs])

  const onKeyDown = (e: KeyboardEvent) => {
    const target = e.target as HTMLElement | null
    const isInput =
      target &&
      (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
    if (isInput) return

    if ((e.code === 'Digit1' || e.code === 'Digit0') && e.shiftKey) {
      e.preventDefault()
      handleZoomToFit()
    } else if (e.key === '=' || e.key === '+') {
      e.preventDefault()
      applyAnchoredZoom(zoom + 0.2)
    } else if (e.key === '-' || e.key === '_') {
      e.preventDefault()
      applyAnchoredZoom(zoom - 0.2)
    } else if (e.code === 'Space') {
      e.preventDefault()
      togglePlay()
    } else if (e.code === 'ArrowLeft') {
      e.preventDefault()
      const delta = e.shiftKey ? 100 : 16.667
      seek(Math.max(0, timelineStore.get().currentTimeMs - delta))
    } else if (e.code === 'ArrowRight') {
      e.preventDefault()
      const delta = e.shiftKey ? 100 : 16.667
      seek(Math.min(timelineStore.get().durationMs, timelineStore.get().currentTimeMs + delta))
    } else if (e.code === 'Home') {
      e.preventDefault()
      seek(0)
    } else if (e.code === 'End') {
      e.preventDefault()
      seek(timelineStore.get().durationMs)
    } else if (e.code === 'KeyJ' && !e.metaKey && !e.ctrlKey) {
      e.preventDefault()
      jumpToPreviousKeyframe()
    } else if (e.code === 'KeyK' && !e.metaKey && !e.ctrlKey) {
      e.preventDefault()
      jumpToNextKeyframe()
    } else if (e.code === 'KeyA' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      selectAllKeyframes()
    } else if (e.code === 'KeyD' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      duplicateSelectedKeyframes()
    } else if (e.code === 'Escape') {
      e.preventDefault()
      selectKeyframe(undefined)
    } else if (e.code === 'Delete' || e.code === 'Backspace') {
      const state = timelineStore.get()
      if (
        state.selectedKeyframeId ||
        (state.selectedKeyframeIds && state.selectedKeyframeIds.length > 0)
      ) {
        e.preventDefault()
        deleteSelectedKeyframes()
      }
    }
  }

  useEventListener('keydown', onKeyDown)

  useEffect(() => {
    const el = scrollContainerRef.current
    if (!el) return

    const handleWheel = (e: WheelEvent) => {
      // Zoom with Ctrl / Cmd / Alt + Wheel
      if (e.ctrlKey || e.metaKey || e.altKey) {
        e.preventDefault()
        const currentZoom = timelineStore.get().zoom
        const zoomFactor = Math.exp(-e.deltaY * 0.0025)
        applyAnchoredZoom(currentZoom * zoomFactor, e.clientX)
        return
      }

      // Smooth horizontal pan on vertical mouse wheel if no vertical overflow in timeline
      if (e.deltaX === 0 && e.deltaY !== 0) {
        if (el.scrollHeight <= el.clientHeight) {
          e.preventDefault()
          el.scrollLeft += e.deltaY
        }
      }
    }

    el.addEventListener('wheel', handleWheel, { passive: false })
    return () => el.removeEventListener('wheel', handleWheel)
  }, [applyAnchoredZoom])

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollLeft(e.currentTarget.scrollLeft)
  }

  const handleClose = () => {
    activeTab.set('design')
  }

  return (
    <div
      data-test-id="animation-timeline"
      className="relative flex w-full flex-col border-t border-border bg-panel shadow-2xl select-none"
      style={{ height: `${timelineHeight}px` }}
    >
      {/* Top draggable resize handle */}
      <div
        className="absolute -top-1.5 left-0 right-0 h-3 z-30 cursor-row-resize flex items-center justify-center group"
        onPointerDown={handleResizeStart}
        onPointerMove={handleResizeMove}
        onPointerUp={handleResizeEnd}
        onPointerCancel={handleResizeEnd}
        onDoubleClick={handleResizeDoubleClick}
      >
        <div className="h-0.5 w-8 rounded-full bg-border group-hover:bg-accent transition-colors" />
      </div>

      {/* Docked Zoom Controls in top-right header overlay */}
      <div
        className="absolute top-1 right-3 z-30 flex items-center gap-1.5 h-6 px-2 py-0.5 rounded-full border border-border bg-panel shadow-xs select-none"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Zoom to fit button */}
        {/* oxlint-disable-next-line openweave/no-hardcoded-tip-labels */}
        <Tip label="Zoom to fit (Shift+1)">
          <button
            type="button"
            data-test-id="timeline-zoom-fit"
            aria-label="Zoom to fit"
            className="size-3.5 flex items-center justify-center text-muted hover:text-surface transition-colors cursor-pointer"
            onClick={handleZoomToFit}
          >
            <Maximize2 className="size-2.5" />
          </button>
        </Tip>

        <div className="h-3 w-px bg-border/80" />

        {/* Zoom out button */}
        {/* oxlint-disable-next-line openweave/no-hardcoded-tip-labels */}
        <Tip label="Zoom out (-)">
          <button
            type="button"
            data-test-id="timeline-zoom-out"
            aria-label="Zoom out"
            className="size-3.5 flex items-center justify-center text-muted hover:text-surface transition-colors cursor-pointer"
            onClick={() => applyAnchoredZoom(zoom - 0.2)}
          >
            <Minus className="size-2.5" />
          </button>
        </Tip>

        {/* Smooth zoom slider */}
        <input
          type="range"
          min={0.2}
          max={2.5}
          step={0.01}
          value={zoom}
          data-test-id="timeline-zoom-slider"
          aria-label="Timeline zoom"
          className="h-1 w-16 cursor-pointer appearance-none rounded-full bg-panel-field accent-accent outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:size-2.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent [&::-webkit-slider-thumb]:shadow-xs [&::-webkit-slider-thumb]:hover:scale-125 [&::-webkit-slider-thumb]:transition-transform [&::-moz-range-thumb]:size-2.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-accent [&::-moz-range-thumb]:border-none"
          onChange={(e) => applyAnchoredZoom(parseFloat(e.target.value))}
          onDoubleClick={handleZoomToFit}
        />

        {/* Zoom in button */}
        {/* oxlint-disable-next-line openweave/no-hardcoded-tip-labels */}
        <Tip label="Zoom in (+)">
          <button
            type="button"
            data-test-id="timeline-zoom-in"
            aria-label="Zoom in"
            className="size-3.5 flex items-center justify-center text-muted hover:text-surface transition-colors cursor-pointer"
            onClick={() => applyAnchoredZoom(zoom + 0.2)}
          >
            <Plus className="size-2.5" />
          </button>
        </Tip>
      </div>

      {/* Upper scrollable tracks & ruler area */}
      <div
        ref={scrollContainerRef}
        className="relative flex-1 min-h-0 overflow-x-auto overflow-y-auto scrollbar-thin"
        onScroll={handleScroll}
      >
        <div className="relative min-w-full min-h-full">
          {/* Top ruler with integrated playback and zoom controls */}
          <Ruler
            durationMs={durationMs}
            zoom={zoom}
            scrollLeft={scrollLeft}
            onSeek={seek}
            onClose={handleClose}
          />

          {/* Layer and property tracks */}
          <TrackList durationMs={durationMs} zoom={zoom} onSeek={seek} />

          {/* Scrubber Playhead */}
          <Playhead durationMs={durationMs} zoom={zoom} onSeek={seek} />

          {/* Empty state when no animation tracks exist */}
          {showEmpty && <EmptyState onDismiss={() => setEmptyDismissed(true)} />}
        </div>
      </div>

      {/* Floating help button at bottom right (matching Figma Motion reference) */}
      <div className="absolute bottom-3 right-4 z-20 flex items-center pointer-events-auto">
        <button
          type="button"
          aria-label="Help and resources"
          className="flex h-6 w-6 items-center justify-center rounded-full bg-panel-field text-surface/70 hover:text-surface hover:bg-hover border border-border text-xs font-semibold shadow transition-colors cursor-pointer"
        >
          ?
        </button>
      </div>
    </div>
  )
}
