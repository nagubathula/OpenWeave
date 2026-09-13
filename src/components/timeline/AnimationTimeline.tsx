import { useStore } from '@nanostores/react'
import React, { useEffect, useRef, useState } from 'react'
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
  timelineHeightStore,
  timelineStore,
  togglePlay
} from '@/app/motion/store'
import type { AnimatableProperty } from '@/app/motion/types'
import EmptyState from '@/components/timeline/EmptyState'
import Playhead from '@/components/timeline/Playhead'
import Ruler from '@/components/timeline/Ruler'
import TrackList from '@/components/timeline/TrackList'

const MIN_TIMELINE_HEIGHT = 180

export default function AnimationTimeline() {
  const { activeTab } = useAIChat()
  const { currentTimeMs, durationMs, zoom } = useStore(timelineStore)
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

  const onKeyDown = (e: KeyboardEvent) => {
    const target = e.target as HTMLElement | null
    const isInput =
      target &&
      (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
    if (isInput) return

    if (e.code === 'Space') {
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

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollLeft(e.currentTarget.scrollLeft)
  }

  const handleClose = () => {
    activeTab.set('design')
  }

  return (
    <div
      data-test-id="animation-timeline"
      className="relative flex w-full flex-col border-t border-white/10 bg-[#1e1e20] shadow-2xl select-none transition-all duration-75"
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
        <div className="h-px w-8 rounded-full bg-white/10 group-hover:bg-accent group-hover:h-[2px] transition-all" />
      </div>

      {/* Upper scrollable tracks & ruler area */}
      <div
        ref={scrollContainerRef}
        className="relative flex-1 min-h-0 overflow-x-auto overflow-y-auto"
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
          <Playhead
            currentTimeMs={currentTimeMs}
            durationMs={durationMs}
            zoom={zoom}
            onSeek={seek}
          />

          {/* Empty state when no animation tracks exist */}
          {showEmpty && <EmptyState onDismiss={() => setEmptyDismissed(true)} />}
        </div>
      </div>

      {/* Floating help button at bottom right (matching Figma Motion reference) */}
      <div className="absolute bottom-3 right-4 z-20 flex items-center pointer-events-auto">
        <button
          type="button"
          aria-label="Help and resources"
          className="flex h-6 w-6 items-center justify-center rounded-full bg-[#2c2c2e] text-white/70 hover:text-white hover:bg-[#38383c] border border-white/10 text-xs font-semibold shadow transition-colors cursor-pointer"
        >
          ?
        </button>
      </div>
    </div>
  )
}
