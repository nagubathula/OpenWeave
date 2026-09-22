import { useStore } from '@nanostores/react'
import * as ContextMenu from '@radix-ui/react-context-menu'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Plus,
  Sparkles,
  Trash2
} from 'lucide-react'
import React, { useRef, useState } from 'react'

import { useSelectionState } from '@openweave/react'

import {
  addKeyframe,
  addPropertyTrack,
  applyMotionPreset,
  duplicateSelectedKeyframes,
  getKeyframeAt,
  hasKeyframeAt,
  interpolateProperty,
  jumpToPropertyKeyframe,
  moveKeyframe,
  moveSelectedKeyframes,
  nodeTracksStore,
  removeKeyframe,
  selectKeyframe,
  selectMultipleKeyframes,
  setKeyframeEasing,
  snapToNearestKeyframe,
  timelineStore,
  toggleSelectKeyframe,
  toggleTrackHidden
} from '@/app/motion/store'
import type {
  AnimatableProperty,
  KeyframeEasing,
  MotionPreset,
  TimelineKeyframe
} from '@/app/motion/types'
import { HEADER_WIDTH } from '@/components/timeline/constants'
import Tip from '@/components/ui/Tip'

interface TrackListProps {
  durationMs: number
  zoom: number
  onSeek: (timeMs: number) => void
}

const ALL_PROPERTIES: AnimatableProperty[] = [
  'x',
  'y',
  'width',
  'height',
  'rotation',
  'opacity',
  'cornerRadius'
]

const PROPERTY_LABELS: Record<AnimatableProperty, string> = {
  x: 'Position',
  y: 'Y',
  width: 'Scale',
  height: 'H',
  rotation: 'Rotation',
  opacity: 'Opacity',
  cornerRadius: 'Radius'
}

const EASING_OPTIONS: { label: string; value: KeyframeEasing }[] = [
  { label: 'Linear', value: 'linear' },
  { label: 'Ease In', value: 'ease-in' },
  { label: 'Ease Out', value: 'ease-out' },
  { label: 'Ease In-Out', value: 'ease-in-out' },
  { label: 'Spring (Bouncy)', value: 'spring' }
]

const MOTION_PRESETS: { id: MotionPreset; label: string; desc: string }[] = [
  { id: 'fadeIn', label: 'Fade In', desc: 'Opacity 0 → 100% (400ms)' },
  { id: 'slideUp', label: 'Slide Up', desc: 'Slide Y + Fade in (450ms)' },
  { id: 'scalePop', label: 'Scale Pop', desc: 'Pop 80% → 100% spring' },
  { id: 'springBounce', label: 'Spring Bounce', desc: 'Playful bounce curve' },
  { id: 'pulse', label: 'Pulse', desc: 'Looping heartbeat fade' }
]

export default function TrackList({ durationMs, zoom, onSeek }: TrackListProps) {
  const { editor, selectedIds } = useSelectionState()
  const tracks = useStore(nodeTracksStore)
  const { currentTimeMs, selectedKeyframeId, selectedKeyframeIds } = useStore(timelineStore)
  const [collapsedNodes, setCollapsedNodes] = useState<Record<string, boolean>>({})
  const containerRef = useRef<HTMLDivElement>(null)

  const [dragging, setDragging] = useState<{
    nodeId: string
    property: AnimatableProperty
    keyframeId: string
    startX: number
    lastTimeMs: number
    isMulti: boolean
  } | null>(null)

  const [marquee, setMarquee] = useState<{
    startX: number
    startY: number
    currX: number
    currY: number
  } | null>(null)

  const cachedKfPositionsRef = useRef<Array<{ id: string; rect: DOMRect }>>([])
  const marqueeRafRef = useRef<number | null>(null)
  const dragRafRef = useRef<number | null>(null)

  const safeDurationMs = Math.max(100, Math.min(60000, Number(durationMs) || 2000))
  const safeZoom = Math.max(0.1, Math.min(5, Number(zoom) || 1))
  const pxPerMs = 0.45 * safeZoom
  const trackWidth = Math.max(800, safeDurationMs * pxPerMs + 100)
  const gridStepPx = Math.max(10, 200 * pxPerMs)

  const gridBackgroundStyle = `repeating-linear-gradient(to right, color-mix(in srgb, var(--color-border) 40%, transparent) 0px, color-mix(in srgb, var(--color-border) 40%, transparent) 1px, transparent 1px, transparent ${gridStepPx}px)`

  const selectedSet = new Set(
    selectedKeyframeIds && selectedKeyframeIds.length > 0
      ? selectedKeyframeIds
      : selectedKeyframeId
        ? [selectedKeyframeId]
        : []
  )

  const toggleCollapse = (nodeId: string) => {
    setCollapsedNodes((prev) => ({ ...prev, [nodeId]: !prev[nodeId] }))
  }

  const handleCanvasPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return
    const target = e.target as HTMLElement
    if (target.closest('[data-keyframe-btn]')) return
    if (!e.shiftKey && !e.metaKey && !e.ctrlKey) selectKeyframe(undefined)

    // Cache keyframe element bounding boxes once to eliminate layout thrashing during mousemove
    if (containerRef.current) {
      const kfElements = containerRef.current.querySelectorAll<HTMLElement>('[data-keyframe-id]')
      const cached: Array<{ id: string; rect: DOMRect }> = []
      kfElements.forEach((el) => {
        const id = el.getAttribute('data-keyframe-id')
        if (id) cached.push({ id, rect: el.getBoundingClientRect() })
      })
      cachedKfPositionsRef.current = cached
    }

    setMarquee({ startX: e.clientX, startY: e.clientY, currX: e.clientX, currY: e.clientY })
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const handleCanvasPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!marquee) return
    const currX = e.clientX
    const currY = e.clientY

    if (marqueeRafRef.current === null) {
      marqueeRafRef.current = requestAnimationFrame(() => {
        marqueeRafRef.current = null
        setMarquee((prev) => (prev ? { ...prev, currX, currY } : null))

        const minX = Math.min(marquee.startX, currX)
        const maxX = Math.max(marquee.startX, currX)
        const minY = Math.min(marquee.startY, currY)
        const maxY = Math.max(marquee.startY, currY)

        const matched: string[] = []
        for (const item of cachedKfPositionsRef.current) {
          const rect = item.rect
          if (rect.right >= minX && rect.left <= maxX && rect.bottom >= minY && rect.top <= maxY) {
            matched.push(item.id)
          }
        }
        selectMultipleKeyframes(matched)
      })
    }
  }

  const handleCanvasPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (marqueeRafRef.current !== null) {
      cancelAnimationFrame(marqueeRafRef.current)
      marqueeRafRef.current = null
    }
    cachedKfPositionsRef.current = []
    if (marquee) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId)
      } catch {
        /* safe */
      }
      setMarquee(null)
    }
  }

  const handleKeyframePointerDown = (
    e: React.PointerEvent<HTMLButtonElement>,
    nodeId: string,
    property: AnimatableProperty,
    kf: TimelineKeyframe
  ) => {
    e.stopPropagation()
    const isShift = e.shiftKey || e.metaKey || e.ctrlKey
    const isAlreadySelected = selectedSet.has(kf.id)
    if (isShift) {
      toggleSelectKeyframe(kf.id)
    } else if (!isAlreadySelected) {
      selectKeyframe(kf.id, nodeId)
    }
    let activeKeyframeId = kf.id
    if (e.altKey) {
      const clonedIds = duplicateSelectedKeyframes()
      if (clonedIds.length > 0 && clonedIds[0]) activeKeyframeId = clonedIds[0]
    }
    setDragging({
      nodeId,
      property,
      keyframeId: activeKeyframeId,
      startX: e.clientX,
      lastTimeMs: kf.timeMs,
      isMulti: isAlreadySelected && selectedSet.size > 1
    })
    e.currentTarget.setPointerCapture(e.pointerId)
    onSeek(kf.timeMs)
  }

  const handleKeyframePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!dragging) return
    const deltaX = e.clientX - dragging.startX
    const deltaTime = Math.round(deltaX / pxPerMs / 10) * 10
    const rawTargetTime = Math.max(0, Math.min(durationMs, dragging.lastTimeMs + deltaTime))
    const isOverride = e.shiftKey || e.metaKey || e.ctrlKey
    const targetTime = isOverride
      ? rawTargetTime
      : snapToNearestKeyframe(rawTargetTime, Math.max(12, 12 / pxPerMs), dragging.keyframeId)

    if (dragRafRef.current === null) {
      dragRafRef.current = requestAnimationFrame(() => {
        dragRafRef.current = null
        if (dragging.isMulti) {
          const stepDelta = targetTime - dragging.lastTimeMs
          if (stepDelta !== 0) {
            moveSelectedKeyframes(stepDelta)
            setDragging((prev) =>
              prev ? { ...prev, lastTimeMs: targetTime, startX: e.clientX } : null
            )
            onSeek(targetTime)
          }
        } else {
          moveKeyframe(dragging.nodeId, dragging.property, dragging.keyframeId, targetTime)
          onSeek(targetTime)
        }
      })
    }
  }

  const handleKeyframePointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (dragRafRef.current !== null) {
      cancelAnimationFrame(dragRafRef.current)
      dragRafRef.current = null
    }
    if (dragging) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId)
      } catch {
        /* safe */
      }
      setDragging(null)
    }
  }

  return (
    <div
      ref={containerRef}
      className="flex flex-1 min-h-0 flex-col"
      style={{ width: `max(100%, ${HEADER_WIDTH + trackWidth}px)` }}
    >
      {/* Marquee rubber-band box */}
      {marquee && (
        <div
          className="pointer-events-none fixed border border-accent bg-accent/10 z-50 rounded-[2px]"
          style={{
            left: `${Math.min(marquee.startX, marquee.currX)}px`,
            top: `${Math.min(marquee.startY, marquee.currY)}px`,
            width: `${Math.abs(marquee.currX - marquee.startX)}px`,
            height: `${Math.abs(marquee.currY - marquee.startY)}px`
          }}
        />
      )}

      {Object.entries(tracks).map(([trackKey, nodeTrack]) => {
        const isCollapsed = Boolean(collapsedNodes[nodeTrack.nodeId])
        const isSelectedNode = selectedIds.has(nodeTrack.nodeId)
        const subTracks = Object.entries(nodeTrack.tracks) as [
          AnimatableProperty,
          NonNullable<(typeof nodeTrack.tracks)[AnimatableProperty]>
        ][]

        return (
          <div key={trackKey} className="flex flex-col">
            {/* Node header row */}
            <div
              className={`flex h-8 items-center border-b border-border transition-colors cursor-pointer ${
                isSelectedNode ? 'bg-accent/10' : 'bg-panel hover:bg-hover'
              }`}
              onClick={() => editor.select([nodeTrack.nodeId])}
            >
              {/* Left: name */}
              <div
                className={`sticky left-0 z-10 flex h-full shrink-0 items-center gap-1.5 border-r px-2 transition-colors ${
                  isSelectedNode
                    ? 'border-accent/30 bg-accent/10 border-l-2 border-l-accent'
                    : 'border-border bg-panel'
                }`}
                style={{ width: `${HEADER_WIDTH}px` }}
              >
                <button
                  type="button"
                  aria-label="Toggle collapse"
                  className="flex size-3.5 shrink-0 cursor-pointer items-center justify-center text-muted hover:text-surface transition-colors"
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleCollapse(nodeTrack.nodeId)
                  }}
                >
                  {isCollapsed ? (
                    <ChevronRight className="size-3" />
                  ) : (
                    <ChevronDown className="size-3" />
                  )}
                </button>

                <span className="text-muted text-[10px] select-none shrink-0 font-mono">
                  {nodeTrack.nodeName.toLowerCase().includes('vector')
                    ? '✦'
                    : nodeTrack.nodeName.toLowerCase().includes('ellipse')
                      ? '○'
                      : '❖'}
                </span>
                <span
                  className={`truncate text-[11px] font-medium select-none flex-1 ${
                    isSelectedNode ? 'text-surface font-semibold' : 'text-surface/80'
                  }`}
                >
                  {nodeTrack.nodeName || 'Layer'}
                </span>

                {/* Action buttons */}
                <div
                  className="flex items-center gap-0.5 shrink-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* oxlint-disable-next-line openweave/no-hardcoded-tip-labels */}
                  <Tip label={nodeTrack.hidden ? 'Show' : 'Hide'}>
                    <button
                      type="button"
                      aria-label={nodeTrack.hidden ? 'Show layer' : 'Hide layer'}
                      className="flex size-5 cursor-pointer items-center justify-center rounded text-muted hover:text-surface hover:bg-hover transition-colors"
                      onClick={() => toggleTrackHidden(nodeTrack.nodeId)}
                    >
                      {nodeTrack.hidden ? (
                        <EyeOff className="size-3" />
                      ) : (
                        <Eye className="size-3" />
                      )}
                    </button>
                  </Tip>

                  {/* Presets dropdown */}
                  <DropdownMenu.Root>
                    <DropdownMenu.Trigger asChild>
                      {/* oxlint-disable-next-line openweave/no-hardcoded-tip-labels */}
                      <Tip label="Presets">
                        <button
                          type="button"
                          aria-label="Motion presets"
                          className="flex size-5 items-center justify-center rounded text-muted hover:text-accent hover:bg-hover cursor-pointer transition-colors"
                        >
                          <Sparkles className="size-3" />
                        </button>
                      </Tip>
                    </DropdownMenu.Trigger>
                    <DropdownMenu.Portal>
                      <DropdownMenu.Content
                        className="z-50 min-w-44 rounded-md bg-panel p-1 shadow-xl border border-border text-xs text-surface"
                        align="end"
                      >
                        <div className="px-2 py-1 text-[10px] font-medium text-muted uppercase tracking-wider">
                          Motion Presets
                        </div>
                        {MOTION_PRESETS.map((p) => (
                          <DropdownMenu.Item
                            key={p.id}
                            className="flex flex-col gap-0.5 rounded px-2 py-1.5 cursor-pointer outline-none hover:bg-accent hover:text-white"
                            onSelect={() => applyMotionPreset(nodeTrack.nodeId, p.id)}
                          >
                            <span className="font-medium text-surface/80">{p.label}</span>
                            <span className="text-[10px] text-muted">{p.desc}</span>
                          </DropdownMenu.Item>
                        ))}
                      </DropdownMenu.Content>
                    </DropdownMenu.Portal>
                  </DropdownMenu.Root>

                  {/* Add property */}
                  <DropdownMenu.Root>
                    <DropdownMenu.Trigger asChild>
                      {/* oxlint-disable-next-line openweave/no-hardcoded-tip-labels */}
                      <Tip label="Add property">
                        <button
                          type="button"
                          aria-label="Add property"
                          className="flex size-5 items-center justify-center rounded text-muted hover:text-surface hover:bg-hover cursor-pointer transition-colors"
                        >
                          <Plus className="size-3" />
                        </button>
                      </Tip>
                    </DropdownMenu.Trigger>
                    <DropdownMenu.Portal>
                      <DropdownMenu.Content
                        className="z-50 min-w-36 rounded-md bg-panel p-1 shadow-xl border border-border text-xs text-surface"
                        align="end"
                      >
                        {ALL_PROPERTIES.map((prop) => {
                          const label = PROPERTY_LABELS[prop]
                          const hasProp = Boolean(nodeTrack.tracks[prop])
                          return (
                            <DropdownMenu.Item
                              key={prop}
                              disabled={hasProp}
                              className={`flex items-center gap-2 rounded px-2 py-1.5 cursor-pointer outline-none text-surface/80 ${
                                hasProp
                                  ? 'opacity-30 cursor-not-allowed'
                                  : 'hover:bg-accent hover:text-white'
                              }`}
                              onSelect={() =>
                                addPropertyTrack(nodeTrack.nodeId, nodeTrack.nodeName, prop)
                              }
                            >
                              <span>{label}</span>
                            </DropdownMenu.Item>
                          )
                        })}
                      </DropdownMenu.Content>
                    </DropdownMenu.Portal>
                  </DropdownMenu.Root>
                </div>
              </div>

              {/* Right: node-level track area */}
              <div
                className="relative h-full select-none flex-1"
                style={{
                  minWidth: `${trackWidth}px`,
                  backgroundImage: gridBackgroundStyle
                }}
                onPointerDown={handleCanvasPointerDown}
                onPointerMove={handleCanvasPointerMove}
                onPointerUp={handleCanvasPointerUp}
              >
                {/* Sequence end delimiter line & inactive region */}
                <div
                  className="absolute top-0 bottom-0 right-0 pointer-events-none bg-black/10 border-l border-dashed border-border/60"
                  style={{ left: `${safeDurationMs * pxPerMs}px` }}
                />
              </div>
            </div>

            {/* Property sub-tracks */}
            {!isCollapsed &&
              subTracks.map(([property, propTrack]) => {
                const label = PROPERTY_LABELS[property]
                const keyframes = propTrack.keyframes
                const isAtKf = hasKeyframeAt(nodeTrack.nodeId, property, currentTimeMs)
                const currentVal = interpolateProperty(propTrack, currentTimeMs) ?? 0
                const isLocked = Boolean(nodeTrack.locked)

                return (
                  <div
                    key={property}
                    className="group flex h-[22px] items-center border-b border-border/40 bg-panel/50 hover:bg-hover/50"
                  >
                    {/* Property label with Figma Motion prev / diamond / next navigation */}
                    <div
                      className="sticky left-0 z-10 flex h-full shrink-0 items-center justify-between border-r border-border bg-panel pl-6 pr-2 cursor-pointer hover:bg-hover transition-colors"
                      style={{ width: `${HEADER_WIDTH}px` }}
                      onClick={() => editor.select([nodeTrack.nodeId])}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[11px] select-none ${
                            isLocked ? 'text-muted/40' : 'text-surface/80 font-medium'
                          }`}
                        >
                          {label}
                        </span>

                        <div
                          className="flex items-center gap-0.5"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {/* Previous keyframe chevron */}
                          {/* oxlint-disable-next-line openweave/no-hardcoded-tip-labels */}
                          <Tip label="Previous keyframe">
                            <button
                              type="button"
                              aria-label="Previous keyframe"
                              className="flex size-3.5 items-center justify-center rounded text-muted hover:text-surface hover:bg-hover transition-colors"
                              onClick={() =>
                                jumpToPropertyKeyframe(nodeTrack.nodeId, property, 'prev')
                              }
                            >
                              <ChevronLeft className="size-2.5" />
                            </button>
                          </Tip>

                          {/* Keyframe toggle diamond */}
                          {/* oxlint-disable-next-line openweave/no-hardcoded-tip-labels */}
                          <Tip label={isAtKf ? 'Remove keyframe' : 'Add keyframe'}>
                            <button
                              type="button"
                              aria-label={isAtKf ? 'Remove keyframe' : 'Add keyframe'}
                              className="flex size-3.5 cursor-pointer items-center justify-center transition-colors hover:scale-110"
                              onClick={() => {
                                if (isAtKf) {
                                  const kf = getKeyframeAt(
                                    nodeTrack.nodeId,
                                    property,
                                    currentTimeMs
                                  )
                                  if (kf) removeKeyframe(nodeTrack.nodeId, property, kf.id)
                                } else {
                                  addKeyframe(
                                    nodeTrack.nodeId,
                                    nodeTrack.nodeName,
                                    property,
                                    Math.round(currentVal * 100) / 100,
                                    currentTimeMs
                                  )
                                }
                              }}
                            >
                              <div
                                className={`size-[7px] rotate-45 rounded-[1px] transition-colors border ${
                                  isAtKf
                                    ? 'bg-accent border-accent shadow-[0_0_6px_rgba(59,130,246,0.6)]'
                                    : 'bg-transparent border-muted hover:border-surface'
                                }`}
                              />
                            </button>
                          </Tip>

                          {/* Next keyframe chevron */}
                          {/* oxlint-disable-next-line openweave/no-hardcoded-tip-labels */}
                          <Tip label="Next keyframe">
                            <button
                              type="button"
                              aria-label="Next keyframe"
                              className="flex size-3.5 items-center justify-center rounded text-muted hover:text-surface hover:bg-hover transition-colors"
                              onClick={() =>
                                jumpToPropertyKeyframe(nodeTrack.nodeId, property, 'next')
                              }
                            >
                              <ChevronRight className="size-2.5" />
                            </button>
                          </Tip>
                        </div>
                      </div>

                      {/* Current value */}
                      <span className="font-mono text-[10px] text-muted tabular-nums">
                        {Math.round(currentVal * 10) / 10}
                      </span>
                    </div>

                    {/* Track area */}
                    <div
                      className="relative h-full select-none cursor-pointer flex-1"
                      style={{
                        minWidth: `${trackWidth}px`,
                        backgroundImage: gridBackgroundStyle
                      }}
                      onPointerDown={handleCanvasPointerDown}
                      onPointerMove={handleCanvasPointerMove}
                      onPointerUp={handleCanvasPointerUp}
                      onClick={(e) => {
                        const target = e.target as HTMLElement
                        if (target.closest('[data-keyframe-btn]')) return
                        const rect = e.currentTarget.getBoundingClientRect()
                        onSeek(
                          Math.max(0, Math.min(safeDurationMs, (e.clientX - rect.left) / pxPerMs))
                        )
                      }}
                      onDoubleClick={(e) => {
                        const target = e.target as HTMLElement
                        if (target.closest('[data-keyframe-btn]')) return
                        const rect = e.currentTarget.getBoundingClientRect()
                        const t = Math.max(
                          0,
                          Math.min(safeDurationMs, Math.round((e.clientX - rect.left) / pxPerMs))
                        )
                        addKeyframe(
                          nodeTrack.nodeId,
                          nodeTrack.nodeName,
                          property,
                          Math.round(currentVal * 100) / 100,
                          t
                        )
                        onSeek(t)
                      }}
                    >
                      {/* Capsule from first to last keyframe - neutral subtle pill matching Figma Motion */}
                      {(() => {
                        if (keyframes.length < 2) return null
                        const first = keyframes[0]
                        const last = keyframes[keyframes.length - 1]
                        if (!first || !last) return null
                        const startX = first.timeMs * pxPerMs
                        const width = (last.timeMs - first.timeMs) * pxPerMs
                        if (width <= 0) return null
                        return (
                          <div
                            className="absolute top-[3px] bottom-[3px] rounded bg-panel-field border border-border flex items-center justify-between px-1 overflow-hidden shadow-xs"
                            style={{ left: `${startX}px`, width: `${width}px` }}
                          >
                            <span className="text-[10px] text-muted/40 font-mono select-none">
                              |
                            </span>
                            <span className="text-[10px] text-muted/40 font-mono select-none">
                              |
                            </span>
                          </div>
                        )
                      })()}

                      {/* Keyframe diamond markers on top of capsule */}
                      {keyframes.map((kf) => {
                        const left = kf.timeMs * pxPerMs
                        const isSelected = selectedSet.has(kf.id)

                        return (
                          <ContextMenu.Root key={kf.id}>
                            <ContextMenu.Trigger asChild>
                              {/* oxlint-disable-next-line openweave/no-hardcoded-tip-labels */}
                              <Tip
                                label={`${label}: ${Math.round(kf.value)} @ ${Math.round(kf.timeMs)}ms`}
                              >
                                <button
                                  type="button"
                                  data-keyframe-btn
                                  data-keyframe-id={kf.id}
                                  aria-label={`Keyframe ${kf.timeMs}ms`}
                                  className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-10 flex size-3.5 items-center justify-center cursor-ew-resize transition-transform hover:scale-125"
                                  style={{ left: `${left}px` }}
                                  onPointerDown={(e) =>
                                    handleKeyframePointerDown(e, nodeTrack.nodeId, property, kf)
                                  }
                                  onPointerMove={handleKeyframePointerMove}
                                  onPointerUp={handleKeyframePointerUp}
                                  onPointerCancel={handleKeyframePointerUp}
                                >
                                  <div
                                    className={`size-2 rotate-45 rounded-[1px] transition-all border ${
                                      isSelected
                                        ? 'bg-accent border-accent shadow-[0_0_8px_rgba(59,130,246,0.8)] scale-110'
                                        : 'bg-panel-field border-muted/80 hover:border-surface hover:bg-surface/20'
                                    }`}
                                  />
                                </button>
                              </Tip>
                            </ContextMenu.Trigger>
                            <ContextMenu.Portal>
                              <ContextMenu.Content className="z-50 min-w-36 rounded-md bg-panel p-1 shadow-xl border border-border text-xs text-surface">
                                <div className="px-2 py-1 text-[10px] font-medium text-muted uppercase tracking-wider">
                                  Easing
                                </div>
                                {EASING_OPTIONS.map((eas) => (
                                  <ContextMenu.Item
                                    key={eas.value}
                                    className={`flex items-center justify-between rounded px-2 py-1.5 cursor-pointer outline-none hover:bg-accent hover:text-white ${
                                      (kf.easing || 'ease-in-out') === eas.value
                                        ? 'text-accent'
                                        : 'text-surface/80'
                                    }`}
                                    onSelect={() =>
                                      setKeyframeEasing(
                                        nodeTrack.nodeId,
                                        property,
                                        kf.id,
                                        eas.value
                                      )
                                    }
                                  >
                                    <span>{eas.label}</span>
                                    {(kf.easing || 'ease-in-out') === eas.value && <span>✓</span>}
                                  </ContextMenu.Item>
                                ))}
                                <ContextMenu.Separator className="my-1 h-px bg-border" />
                                <ContextMenu.Item
                                  className="flex items-center gap-2 rounded px-2 py-1.5 text-red-400 cursor-pointer outline-none hover:bg-red-500 hover:text-white"
                                  onSelect={() => removeKeyframe(nodeTrack.nodeId, property, kf.id)}
                                >
                                  <Trash2 className="size-3" />
                                  <span>Delete Keyframe</span>
                                </ContextMenu.Item>
                              </ContextMenu.Content>
                            </ContextMenu.Portal>
                          </ContextMenu.Root>
                        )
                      })}

                      {/* Sequence end delimiter line & inactive region */}
                      <div
                        className="absolute top-0 bottom-0 right-0 pointer-events-none bg-black/10 border-l border-dashed border-border/60"
                        style={{ left: `${safeDurationMs * pxPerMs}px` }}
                      />
                    </div>
                  </div>
                )
              })}
          </div>
        )
      })}
    </div>
  )
}
