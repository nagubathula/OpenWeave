import { useStore } from '@nanostores/react'
import { ChevronDown, ChevronRight, Eye, Layers, Move, RotateCw, Scaling } from 'lucide-react'
import React, { useState } from 'react'

import { nodeTracksStore, removeKeyframe, timelineStore } from '@/app/motion/store'
import type { AnimatableProperty } from '@/app/motion/types'
import Tip from '@/components/ui/Tip'

interface TrackListProps {
  durationMs: number
  zoom: number
  onSeek: (timeMs: number) => void
}

const PROPERTY_LABELS: Record<AnimatableProperty, { label: string; icon: React.ElementType }> = {
  x: { label: 'Position X', icon: Move },
  y: { label: 'Position Y', icon: Move },
  width: { label: 'Width', icon: Scaling },
  height: { label: 'Height', icon: Scaling },
  rotation: { label: 'Rotation', icon: RotateCw },
  opacity: { label: 'Opacity', icon: Eye }
}

export default function TrackList({ durationMs, zoom, onSeek }: TrackListProps) {
  const tracks = useStore(nodeTracksStore)
  const { currentTimeMs } = useStore(timelineStore)
  const [collapsedNodes, setCollapsedNodes] = useState<Record<string, boolean>>({})

  const pxPerMs = 0.45 * zoom
  const trackWidth = Math.max(800, durationMs * pxPerMs + 100)

  const toggleCollapse = (nodeId: string) => {
    setCollapsedNodes((prev) => ({ ...prev, [nodeId]: !prev[nodeId] }))
  }

  const handleKeyframeClick = (e: React.MouseEvent, timeMs: number) => {
    e.stopPropagation()
    onSeek(timeMs)
  }

  return (
    <div className="flex flex-1 min-h-0 divide-y divide-border/30">
      {Object.values(tracks).map((nodeTrack) => {
        const isCollapsed = Boolean(collapsedNodes[nodeTrack.nodeId])
        const subTracks = Object.entries(nodeTrack.tracks) as [
          AnimatableProperty,
          NonNullable<(typeof nodeTrack.tracks)[AnimatableProperty]>
        ][]

        return (
          <div key={nodeTrack.nodeId} className="flex flex-col">
            {/* Header row for the node */}
            <div className="flex h-7 items-center border-b border-border/30 bg-panel/40 hover:bg-hover/30">
              {/* Left node info */}
              <div className="sticky left-0 z-10 flex h-full w-48 shrink-0 items-center gap-1.5 border-r border-border/40 bg-panel px-2">
                <button
                  type="button"
                  aria-label="Toggle collapse"
                  className="flex size-4 cursor-pointer items-center justify-center text-muted hover:text-surface"
                  onClick={() => toggleCollapse(nodeTrack.nodeId)}
                >
                  {isCollapsed ? (
                    <ChevronRight className="size-3" />
                  ) : (
                    <ChevronDown className="size-3" />
                  )}
                </button>

                <Layers className="size-3 text-muted" />
                <span className="truncate text-xs font-medium text-surface">
                  {nodeTrack.nodeName || 'Unnamed Layer'}
                </span>
              </div>

              {/* Right timeline canvas for node level */}
              <div className="relative h-full select-none" style={{ width: `${trackWidth}px` }} />
            </div>

            {/* Sub-tracks for animatable properties */}
            {!isCollapsed &&
              subTracks.map(([property, propTrack]) => {
                const info = PROPERTY_LABELS[property]
                const Icon = info.icon

                // Calculate connection bars between adjacent keyframes
                const keyframes = propTrack.keyframes

                return (
                  <div
                    key={property}
                    className="group flex h-6 items-center border-b border-border/20 bg-background/20 hover:bg-hover/20"
                  >
                    {/* Property name label */}
                    <div className="sticky left-0 z-10 flex h-full w-48 shrink-0 items-center justify-between border-r border-border/40 bg-panel/95 pl-7 pr-2 text-[11px] text-muted">
                      <div className="flex items-center gap-1.5 truncate">
                        <Icon className="size-2.5 opacity-60" />
                        <span className="truncate">{info.label}</span>
                      </div>

                      <span className="font-mono text-[10px] opacity-70">
                        {keyframes[keyframes.length - 1]?.value ?? 0}
                      </span>
                    </div>

                    {/* Keyframe diamonds & connection spans */}
                    <div
                      className="relative h-full select-none"
                      style={{ width: `${trackWidth}px` }}
                      onClick={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect()
                        const clickX = e.clientX - rect.left
                        const clickedTime = Math.max(0, Math.min(durationMs, clickX / pxPerMs))
                        onSeek(clickedTime)
                      }}
                    >
                      {/* Connection spans between keyframes */}
                      {keyframes.map((kf, idx) => {
                        const nextKf = keyframes[idx + 1]
                        if (!nextKf) return null
                        const startX = kf.timeMs * pxPerMs
                        const width = (nextKf.timeMs - kf.timeMs) * pxPerMs

                        return (
                          <div
                            key={`span-${kf.id}`}
                            className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-accent/40"
                            style={{ left: `${startX}px`, width: `${width}px` }}
                          />
                        )
                      })}

                      {/* Diamond keyframe markers */}
                      {keyframes.map((kf) => {
                        const left = kf.timeMs * pxPerMs
                        const isAtCurrent = Math.abs(kf.timeMs - currentTimeMs) <= 10

                        return (
                          <Tip
                            key={kf.id}
                            label={`${info.label}: ${kf.value} @ ${Math.round(kf.timeMs)}ms`}
                          >
                            <button
                              type="button"
                              aria-label={`Keyframe ${kf.timeMs}ms`}
                              className={`absolute top-1/2 -translate-x-1/2 -translate-y-1/2 size-2.5 rotate-45 rounded-[1px] transition-transform hover:scale-125 cursor-pointer z-10 ${
                                isAtCurrent
                                  ? 'bg-accent shadow-[0_0_6px_rgb(59_130_246/0.8)]'
                                  : 'bg-muted-foreground/80 hover:bg-accent'
                              }`}
                              style={{ left: `${left}px` }}
                              onClick={(e) => handleKeyframeClick(e, kf.timeMs)}
                              onContextMenu={(e) => {
                                e.preventDefault()
                                removeKeyframe(nodeTrack.nodeId, property, kf.id)
                              }}
                            />
                          </Tip>
                        )
                      })}
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
