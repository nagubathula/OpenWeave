import { useStore } from '@nanostores/react'
import {
  ArrowDown,
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Circle,
  Code,
  Component,
  Copy,
  CornerDownLeft,
  Diamond,
  Eye,
  Film,
  Frame,
  Layers,
  Link2,
  Minus,
  MoreHorizontal,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Sparkles,
  Square,
  Trash2,
  Type,
  Wand2
} from 'lucide-react'
import React, { useState } from 'react'

import { colorToHexRaw } from '@openweave/core/color'
import { useSelectionState } from '@openweave/react'
import type { NodeType, SpringConfig, SpringPreset } from '@openweave/scene-graph'

import { useEditorStore } from '@/app/editor/active-store'
import {
  generateCssKeyframes,
  generateFramerMotion,
  generateWebAnimations
} from '@/app/motion/export'
import {
  addKeyframe,
  applyMotionPreset,
  deleteSelectedKeyframes,
  hasKeyframeAt,
  jumpToPropertyKeyframe,
  moveKeyframe,
  nodeTracksStore,
  nudgeSelectedKeyframes,
  removeKeyframe,
  seek,
  setKeyframeEasing,
  setKeyframeEasingForSelected,
  timelineStore,
  togglePlay
} from '@/app/motion/store'
import type {
  AnimatableProperty,
  KeyframeEasing,
  MotionPreset,
  NodeAnimationTrack,
  PropertyTrack,
  TimelineKeyframe
} from '@/app/motion/types'
import NumberField from '@/components/inputs/NumberField'
import BezierCurveEditor from '@/components/motion/BezierCurveEditor'
import SpringCurveEditor from '@/components/prototype/SpringCurveEditor'
import Tip from '@/components/ui/Tip'

const MOTION_PRESET_ITEMS: { id: MotionPreset; label: string; desc: string; category: string }[] = [
  { id: 'fadeIn', label: 'Fade In', desc: 'Opacity 0 → 1', category: 'Entrance' },
  { id: 'slideUp', label: 'Slide Up', desc: 'Slide Y + Fade', category: 'Entrance' },
  { id: 'scalePop', label: 'Scale Pop', desc: 'Spring scale up', category: 'Entrance' },
  { id: 'springBounce', label: 'Bounce', desc: 'Spring overshoot', category: 'Physics' },
  { id: 'pulse', label: 'Pulse', desc: 'Heartbeat loop', category: 'Emphasis' }
]

const EASING_SELECT_OPTIONS: { label: string; value: KeyframeEasing }[] = [
  { label: 'Ease In-Out', value: 'ease-in-out' },
  { label: 'Ease Out', value: 'ease-out' },
  { label: 'Ease In', value: 'ease-in' },
  { label: 'Linear', value: 'linear' },
  { label: 'Spring', value: 'spring' }
]

function getNodeTypeIcon(type?: NodeType) {
  switch (type) {
    case 'FRAME':
      return Frame
    case 'TEXT':
      return Type
    case 'RECTANGLE':
      return Square
    case 'ELLIPSE':
      return Circle
    case 'COMPONENT':
    case 'INSTANCE':
      return Component
    default:
      return Layers
  }
}

function getKeyframeState(
  nodeId: string,
  property: AnimatableProperty,
  currentTimeMs: number,
  tracks: Record<string, NodeAnimationTrack>
): 'active' | 'has_keyframes' | 'none' {
  const propTrack = tracks[nodeId]?.tracks[property]
  if (!propTrack || propTrack.keyframes.length === 0) return 'none'
  const isAtPlayhead = propTrack.keyframes.some((k) => Math.abs(k.timeMs - currentTimeMs) <= 20)
  return isAtPlayhead ? 'active' : 'has_keyframes'
}

export default function MotionPanel() {
  const store = useEditorStore()
  const {
    currentTimeMs,
    isPlaying,
    selectedKeyframeId,
    selectedKeyframeIds = [],
    durationMs
  } = useStore(timelineStore)
  const tracks = useStore(nodeTracksStore)
  const { selectedNode } = useSelectionState()

  const [springPreset, setSpringPreset] = useState<SpringPreset>('BOUNCY')
  const [springConfig, setSpringConfig] = useState<SpringConfig>({
    stiffness: 600,
    damping: 15,
    mass: 1
  })
  const [exportFormat, setExportFormat] = useState<'framer' | 'css' | 'waapi'>('framer')
  const [copied, setCopied] = useState(false)
  const [devModeExpanded, setDevModeExpanded] = useState(false)
  const [scaleLocked, setScaleLocked] = useState(true)
  const [scaleXPercent, setScaleXPercent] = useState(100)
  const [scaleYPercent, setScaleYPercent] = useState(100)

  const handleToggleKeyframe = (property: AnimatableProperty, value: number) => {
    if (!selectedNode) return
    const isKeyframed = hasKeyframeAt(selectedNode.id, property, currentTimeMs)
    if (isKeyframed) {
      const nodeTrack = tracks[selectedNode.id]
      const propTrack = nodeTrack?.tracks[property]
      const kf = propTrack?.keyframes.find((k) => Math.abs(k.timeMs - currentTimeMs) <= 20)
      if (kf) {
        removeKeyframe(selectedNode.id, property, kf.id)
      }
    } else {
      addKeyframe(selectedNode.id, selectedNode.name || 'Layer', property, value, currentTimeMs)
    }
  }

  // Find currently selected keyframe across all tracks
  let selectedKfData: {
    nodeId: string
    nodeName: string
    property: AnimatableProperty
    keyframe: TimelineKeyframe
  } | null = null

  if (selectedKeyframeId) {
    for (const [nodeId, nodeTrack] of Object.entries(tracks)) {
      for (const [prop, propTrack] of Object.entries(nodeTrack.tracks) as [
        AnimatableProperty,
        PropertyTrack | undefined
      ][]) {
        const kf = propTrack?.keyframes.find((k) => k.id === selectedKeyframeId)
        if (kf) {
          selectedKfData = {
            nodeId,
            nodeName: nodeTrack.nodeName || 'Layer',
            property: prop,
            keyframe: kf
          }
          break
        }
      }
      if (selectedKfData) break
    }
  }

  const isMultiSelection = (selectedKeyframeIds?.length ?? 0) > 1

  // Generate exported animation code for the selected layer
  const currentTrack = selectedNode ? tracks[selectedNode.id] : undefined
  const exportedCode = currentTrack
    ? exportFormat === 'framer'
      ? generateFramerMotion(currentTrack, durationMs)
      : exportFormat === 'css'
        ? generateCssKeyframes(currentTrack, durationMs)
        : generateWebAnimations(currentTrack, durationMs)
    : ''

  const handleCopyCode = async () => {
    if (!exportedCode) return
    try {
      await navigator.clipboard.writeText(exportedCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback
    }
  }

  const selectedNodeTrack = selectedNode ? tracks[selectedNode.id] : undefined
  const totalKeyframesOnNode = selectedNodeTrack
    ? Object.values(selectedNodeTrack.tracks).reduce(
        (sum, p) => sum + (p?.keyframes.length ?? 0),
        0
      )
    : 0

  const NodeIcon = getNodeTypeIcon(selectedNode?.type)

  return (
    <div
      data-test-id="motion-panel"
      className="flex flex-1 flex-col overflow-y-auto divide-y divide-border/40 text-xs select-none scrollbar-thin"
    >
      {/* Figma Motion Top Bar */}
      <div className="flex items-center justify-between px-3 py-2 bg-panel/70 backdrop-blur-sm border-b border-border/40">
        <div className="flex items-center gap-2">
          <div className="flex size-6 items-center justify-center rounded-md bg-accent/15 text-accent">
            <Film className="size-3.5" />
          </div>
          <span className="font-semibold text-surface">Motion</span>
          <span className="rounded-full bg-accent/20 px-2 py-0.5 text-[9px] font-semibold text-accent uppercase tracking-wider">
            Beta
          </span>
        </div>

        <div className="flex items-center gap-1">
          {/* Timecode badge */}
          <span className="font-mono text-[10px] text-muted bg-background/60 px-1.5 py-0.5 rounded border border-border/30">
            {Math.round(currentTimeMs)}ms
          </span>

          {/* Reset time button */}
          {currentTimeMs > 0 && (
            /* oxlint-disable-next-line openweave/no-hardcoded-tip-labels */
            <Tip label="Reset playhead to start">
              <button
                type="button"
                className="flex size-6 cursor-pointer items-center justify-center rounded text-muted hover:bg-hover hover:text-surface transition-colors"
                onClick={() => seek(0)}
              >
                <RotateCcw className="size-3" />
              </button>
            </Tip>
          )}

          {/* Play/Pause preview */}
          {/* oxlint-disable-next-line openweave/no-hardcoded-tip-labels */}
          <Tip label={isPlaying ? 'Pause preview (Space)' : 'Play preview (Space)'}>
            <button
              type="button"
              className={`flex size-6 cursor-pointer items-center justify-center rounded transition-colors ${
                isPlaying
                  ? 'bg-accent text-white shadow-xs'
                  : 'text-surface hover:bg-hover hover:text-white'
              }`}
              onClick={togglePlay}
            >
              {isPlaying ? (
                <Pause className="size-3 fill-current" />
              ) : (
                <Play className="size-3 fill-current" />
              )}
            </button>
          </Tip>

          {/* Dev Mode toggle button */}
          {/* oxlint-disable-next-line openweave/no-hardcoded-tip-labels */}
          <Tip label="Developer Mode Code Handoff">
            <button
              type="button"
              className={`flex size-6 cursor-pointer items-center justify-center rounded transition-colors ${
                devModeExpanded
                  ? 'bg-accent/20 text-accent'
                  : 'text-muted hover:bg-hover hover:text-surface'
              }`}
              onClick={() => setDevModeExpanded(!devModeExpanded)}
            >
              <Code className="size-3" />
            </button>
          </Tip>

          {/* More options button */}
          {/* oxlint-disable-next-line openweave/no-hardcoded-tip-labels */}
          <Tip label="Motion Options">
            <button
              type="button"
              className="flex size-6 cursor-pointer items-center justify-center rounded text-muted hover:bg-hover hover:text-surface transition-colors"
            >
              <MoreHorizontal className="size-3.5" />
            </button>
          </Tip>
        </div>
      </div>

      {/* No Layer Selected State */}
      {!selectedNode ? (
        Object.keys(tracks).length > 0 ? (
          <div className="p-3 space-y-3">
            <div className="flex items-center justify-between text-[11px] font-medium text-surface">
              <span className="flex items-center gap-1.5">
                <Layers className="size-3 text-muted" />
                <span>Animated Layers ({Object.keys(tracks).length})</span>
              </span>
            </div>
            <div className="space-y-1.5">
              {Object.values(tracks).map((track) => {
                const activeProps = Object.keys(track.tracks) as AnimatableProperty[]
                const totalKfCount = Object.values(track.tracks).reduce(
                  (sum, p) => sum + (p?.keyframes.length ?? 0),
                  0
                )
                const nodeRef = store.graph.getNode(track.nodeId)
                const TrackIcon = getNodeTypeIcon(nodeRef?.type)

                return (
                  <button
                    key={track.nodeId}
                    type="button"
                    className="w-full flex flex-col gap-1.5 rounded-lg border border-border/50 bg-background/40 p-2 text-left transition-all hover:border-accent hover:bg-accent/5 hover:shadow-xs cursor-pointer group"
                    onClick={() => store.select([track.nodeId])}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 truncate">
                        <TrackIcon className="size-3 text-accent shrink-0" />
                        <span className="font-medium text-surface text-xs truncate group-hover:text-accent transition-colors">
                          {track.nodeName || 'Unnamed Layer'}
                        </span>
                      </div>
                      <span className="rounded-full bg-accent/15 px-1.5 py-0.2 text-[9px] font-mono text-accent font-semibold">
                        {totalKfCount} kf
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {activeProps.map((p) => (
                        <span
                          key={p}
                          className="rounded bg-panel px-1.5 py-0.5 text-[9px] uppercase font-mono text-muted border border-border/40"
                        >
                          {p}
                        </span>
                      ))}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        ) : (
          <div className="p-8 text-center space-y-3 text-muted">
            <div className="flex size-12 mx-auto items-center justify-center rounded-2xl bg-accent/10 border border-accent/20 text-accent">
              <Film className="size-6" />
            </div>
            <div className="space-y-1">
              <p className="font-semibold text-surface text-xs">No Layer Selected</p>
              <p className="text-[11px] leading-relaxed text-muted max-w-[200px] mx-auto">
                Select any object on the canvas or timeline to animate its properties or apply
                motion presets.
              </p>
            </div>
          </div>
        )
      ) : (
        <>
          {/* Active Layer Header Card */}
          <div className="flex items-center justify-between px-3 py-2 bg-accent/5 border-b border-border/40">
            <div className="flex items-center gap-2 truncate">
              <div className="flex size-5 items-center justify-center rounded bg-accent/15 text-accent shrink-0">
                <NodeIcon className="size-3" />
              </div>
              <div className="flex flex-col truncate">
                <span className="font-semibold text-surface text-xs truncate">
                  {selectedNode.name || 'Unnamed Layer'}
                </span>
                <span className="text-[10px] text-muted capitalize">
                  {selectedNode.type?.toLowerCase().replace('_', ' ')}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Component status or conversion button */}
              {selectedNode.type === 'COMPONENT' ? (
                <span className="flex items-center gap-1 rounded bg-purple-500/15 px-1.5 py-0.5 text-[9px] font-medium text-purple-400 border border-purple-500/30">
                  <Component className="size-2.5" />
                  <span>Component</span>
                </span>
              ) : selectedNode.type === 'INSTANCE' ? (
                <span className="flex items-center gap-1 rounded bg-accent/15 px-1.5 py-0.5 text-[9px] font-medium text-accent border border-accent/30">
                  <Component className="size-2.5" />
                  <span>Instance</span>
                </span>
              ) : (
                /* oxlint-disable-next-line openweave/no-hardcoded-tip-labels */
                <Tip label="Convert animated layer into a reusable Component">
                  <button
                    type="button"
                    className="flex items-center gap-1 rounded bg-panel hover:bg-hover px-1.5 py-0.5 text-[9px] font-medium text-surface border border-border/60 transition-colors cursor-pointer"
                    onClick={() => store.createComponentFromSelection()}
                  >
                    <Component className="size-2.5 text-purple-400" />
                    <span>Make Component</span>
                  </button>
                </Tip>
              )}

              {totalKeyframesOnNode > 0 && (
                <span className="rounded-full bg-accent/20 px-2 py-0.5 text-[9px] font-mono text-accent font-medium">
                  {totalKeyframesOnNode} kf
                </span>
              )}
            </div>
          </div>

          {/* Multi-Keyframe Selection Inspector */}
          {isMultiSelection && (
            <div className="p-3 space-y-2.5 bg-accent/10 border-b border-border/40">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-semibold text-accent text-xs">
                  <Diamond className="size-3.5 fill-current" />
                  <span>{selectedKeyframeIds.length} Keyframes Selected</span>
                </div>
                {/* oxlint-disable-next-line openweave/no-hardcoded-tip-labels */}
                <Tip label="Delete selected keyframes">
                  <button
                    type="button"
                    className="flex size-6 items-center justify-center rounded text-muted hover:bg-hover hover:text-destructive cursor-pointer transition-colors"
                    onClick={deleteSelectedKeyframes}
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </Tip>
              </div>

              {/* Batch Easing Curve Changer */}
              <div className="space-y-1">
                <div className="text-[10px] font-medium text-muted">Batch Easing Curve</div>
                <div className="flex flex-wrap gap-1">
                  {EASING_SELECT_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      className="rounded px-2 py-1 text-[10px] bg-panel text-muted hover:bg-accent hover:text-white cursor-pointer transition-colors border border-border/40"
                      onClick={() => setKeyframeEasingForSelected(opt.value)}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Batch Timing Nudge */}
              <div className="space-y-1">
                <div className="text-[10px] font-medium text-muted">Nudge Timing</div>
                <div className="grid grid-cols-4 gap-1">
                  {[-50, -10, 10, 50].map((delta) => (
                    <button
                      key={delta}
                      type="button"
                      className="rounded py-1 text-[10px] font-mono bg-panel text-muted hover:bg-hover hover:text-surface cursor-pointer text-center border border-border/40 transition-colors"
                      onClick={() => nudgeSelectedKeyframes(delta)}
                    >
                      {delta > 0 ? `+${delta}ms` : `${delta}ms`}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Single Selected Keyframe Inspector */}
          {!isMultiSelection && selectedKfData && (
            <div className="p-3 space-y-2.5 bg-accent/5 border-b border-border/40">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-semibold text-accent text-xs">
                  <Diamond className="size-3.5 fill-current" />
                  <span>Keyframe • {selectedKfData.property.toUpperCase()}</span>
                </div>
                {/* oxlint-disable-next-line openweave/no-hardcoded-tip-labels */}
                <Tip label="Delete keyframe">
                  <button
                    type="button"
                    className="flex size-6 items-center justify-center rounded text-muted hover:bg-hover hover:text-destructive cursor-pointer transition-colors"
                    onClick={() => {
                      if (selectedKfData) {
                        removeKeyframe(
                          selectedKfData.nodeId,
                          selectedKfData.property,
                          selectedKfData.keyframe.id
                        )
                      }
                    }}
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </Tip>
              </div>

              {/* Time & Value controls */}
              <div className="grid grid-cols-2 gap-2">
                <NumberField
                  label="Time"
                  value={Math.round(selectedKfData.keyframe.timeMs)}
                  suffix="ms"
                  onChange={(t) => {
                    if (selectedKfData) {
                      moveKeyframe(
                        selectedKfData.nodeId,
                        selectedKfData.property,
                        selectedKfData.keyframe.id,
                        t
                      )
                    }
                  }}
                />
                <NumberField
                  label="Val"
                  value={Math.round(selectedKfData.keyframe.value * 100) / 100}
                  onChange={(v) => {
                    if (selectedKfData) {
                      addKeyframe(
                        selectedKfData.nodeId,
                        selectedKfData.nodeName || 'Layer',
                        selectedKfData.property,
                        v,
                        selectedKfData.keyframe.timeMs,
                        selectedKfData.keyframe.easing
                      )
                    }
                  }}
                />
              </div>

              {/* Easing Selector */}
              <div className="space-y-1">
                <div className="text-[10px] font-medium text-muted">Easing Curve</div>
                <div className="flex flex-wrap gap-1">
                  {EASING_SELECT_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      className={`rounded px-2 py-0.5 text-[10px] cursor-pointer transition-colors border ${
                        (selectedKfData?.keyframe.easing || 'ease-in-out') === opt.value
                          ? 'border-accent bg-accent text-white font-semibold shadow-xs'
                          : 'border-border/40 bg-panel text-muted hover:bg-hover hover:text-surface'
                      }`}
                      onClick={() => {
                        if (selectedKfData) {
                          setKeyframeEasing(
                            selectedKfData.nodeId,
                            selectedKfData.property,
                            selectedKfData.keyframe.id,
                            opt.value
                          )
                        }
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Visual Bezier / Spring curve preview */}
              {selectedKfData.keyframe.easing === 'spring' ? (
                <div className="rounded-lg border border-border/50 bg-background/30 p-2 mt-1">
                  <SpringCurveEditor
                    preset={springPreset}
                    config={springConfig}
                    onPresetChange={setSpringPreset}
                    onConfigChange={setSpringConfig}
                  />
                </div>
              ) : (
                <div className="rounded-lg border border-border/50 bg-background/30 p-2 mt-1">
                  <BezierCurveEditor />
                </div>
              )}
            </div>
          )}

          {/* Animations Section */}
          <div className="p-3 space-y-2 border-b border-border/40">
            <div className="flex items-center justify-between text-[11px] font-semibold text-surface">
              <span>Animations</span>
              {/* oxlint-disable-next-line openweave/no-hardcoded-tip-labels */}
              <Tip label="Add animation track">
                <button
                  type="button"
                  className="flex size-5 items-center justify-center rounded text-muted hover:bg-hover hover:text-surface transition-colors cursor-pointer"
                  onClick={() => handleToggleKeyframe('opacity', selectedNode.opacity ?? 1)}
                >
                  <Plus className="size-3.5" />
                </button>
              </Tip>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border/50 bg-background/50 p-2">
              <div className="flex items-center gap-2">
                <Sparkles className="size-3.5 text-accent" />
                <select
                  aria-label="Animation preset"
                  className="bg-transparent text-xs text-surface font-medium outline-none cursor-pointer"
                  onChange={(e) => {
                    if (e.target.value) {
                      applyMotionPreset(selectedNode.id, e.target.value as MotionPreset)
                    }
                  }}
                  defaultValue="fadeIn"
                >
                  {MOTION_PRESET_ITEMS.map((p) => (
                    <option key={p.id} value={p.id} className="bg-panel text-surface">
                      {p.label} ({p.desc})
                    </option>
                  ))}
                </select>
              </div>
              <span className="text-[9px] text-muted font-mono uppercase bg-panel px-1.5 py-0.5 rounded border border-border/40">
                Smart
              </span>
            </div>
          </div>

          {/* Transform Section */}
          <div className="p-3 space-y-2.5 border-b border-border/40">
            <div className="flex items-center justify-between text-[11px] font-semibold text-surface">
              <span>Transform</span>
              <div className="flex items-center gap-0.5">
                {/* oxlint-disable-next-line openweave/no-hardcoded-tip-labels */}
                <Tip label="Jump to previous position keyframe">
                  <button
                    type="button"
                    className="flex size-4 items-center justify-center text-muted hover:text-surface cursor-pointer disabled:opacity-30"
                    onClick={() => jumpToPropertyKeyframe(selectedNode.id, 'x', 'prev')}
                  >
                    <ChevronLeft className="size-2.5" />
                  </button>
                </Tip>
                {/* oxlint-disable-next-line openweave/no-hardcoded-tip-labels */}
                <Tip label="Toggle position keyframe at playhead">
                  <button
                    type="button"
                    className="flex size-4 items-center justify-center text-muted hover:text-surface cursor-pointer"
                    onClick={() => {
                      handleToggleKeyframe('x', selectedNode.x ?? 0)
                      handleToggleKeyframe('y', selectedNode.y ?? 0)
                    }}
                  >
                    <Diamond className="size-2.5" />
                  </button>
                </Tip>
                {/* oxlint-disable-next-line openweave/no-hardcoded-tip-labels */}
                <Tip label="Jump to next position keyframe">
                  <button
                    type="button"
                    className="flex size-4 items-center justify-center text-muted hover:text-surface cursor-pointer disabled:opacity-30"
                    onClick={() => jumpToPropertyKeyframe(selectedNode.id, 'x', 'next')}
                  >
                    <ChevronRight className="size-2.5" />
                  </button>
                </Tip>
              </div>
            </div>

            {/* Position */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[10px] text-muted">
                <span>Position</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 grid grid-cols-2 gap-1.5">
                  <NumberField
                    label="X"
                    value={Math.round(selectedNode.x ?? 0)}
                    onChange={(val) => {
                      selectedNode.x = val
                      store.requestRepaint()
                      if (hasKeyframeAt(selectedNode.id, 'x', currentTimeMs)) {
                        addKeyframe(selectedNode.id, selectedNode.name, 'x', val, currentTimeMs)
                      }
                    }}
                  />
                  <NumberField
                    label="Y"
                    value={Math.round(selectedNode.y ?? 0)}
                    onChange={(val) => {
                      selectedNode.y = val
                      store.requestRepaint()
                      if (hasKeyframeAt(selectedNode.id, 'y', currentTimeMs)) {
                        addKeyframe(selectedNode.id, selectedNode.name, 'y', val, currentTimeMs)
                      }
                    }}
                  />
                </div>
                {(() => {
                  const stateX = getKeyframeState(selectedNode.id, 'x', currentTimeMs, tracks)
                  const stateY = getKeyframeState(selectedNode.id, 'y', currentTimeMs, tracks)
                  const isActive = stateX === 'active' || stateY === 'active'
                  const hasKeyframes = stateX === 'has_keyframes' || stateY === 'has_keyframes'

                  return (
                    /* oxlint-disable-next-line openweave/no-hardcoded-tip-labels */
                    <Tip label={isActive ? 'Remove Position keyframe' : 'Add Position keyframe'}>
                      <button
                        type="button"
                        data-test-id="keyframe-position-toggle"
                        className={`flex size-6 cursor-pointer items-center justify-center rounded border transition-colors ${
                          isActive
                            ? 'border-accent bg-accent text-white shadow-xs'
                            : hasKeyframes
                              ? 'border-accent/60 bg-accent/15 text-accent'
                              : 'border-border/60 text-muted hover:border-border hover:text-surface'
                        }`}
                        onClick={() => {
                          handleToggleKeyframe('x', selectedNode.x ?? 0)
                          handleToggleKeyframe('y', selectedNode.y ?? 0)
                        }}
                      >
                        <Diamond className={`size-3 ${isActive ? 'fill-current' : ''}`} />
                      </button>
                    </Tip>
                  )
                })()}
              </div>
            </div>

            {/* Scale */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[10px] text-muted">
                <span>Scale</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 grid grid-cols-2 gap-1.5">
                  <NumberField
                    label="W%"
                    value={scaleXPercent}
                    min={1}
                    max={500}
                    onChange={(val) => {
                      const factor = val / (scaleXPercent || 100)
                      setScaleXPercent(val)
                      if (scaleLocked) {
                        setScaleYPercent(val)
                        selectedNode.height = Math.round((selectedNode.height ?? 100) * factor)
                      }
                      selectedNode.width = Math.round((selectedNode.width ?? 100) * factor)
                      store.requestRepaint()
                      if (hasKeyframeAt(selectedNode.id, 'width', currentTimeMs)) {
                        addKeyframe(
                          selectedNode.id,
                          selectedNode.name,
                          'width',
                          selectedNode.width,
                          currentTimeMs
                        )
                        if (scaleLocked) {
                          addKeyframe(
                            selectedNode.id,
                            selectedNode.name,
                            'height',
                            selectedNode.height,
                            currentTimeMs
                          )
                        }
                      }
                    }}
                  />
                  <NumberField
                    label="H%"
                    value={scaleYPercent}
                    min={1}
                    max={500}
                    onChange={(val) => {
                      const factor = val / (scaleYPercent || 100)
                      setScaleYPercent(val)
                      if (scaleLocked) {
                        setScaleXPercent(val)
                        selectedNode.width = Math.round((selectedNode.width ?? 100) * factor)
                      }
                      selectedNode.height = Math.round((selectedNode.height ?? 100) * factor)
                      store.requestRepaint()
                      if (hasKeyframeAt(selectedNode.id, 'height', currentTimeMs)) {
                        addKeyframe(
                          selectedNode.id,
                          selectedNode.name,
                          'height',
                          selectedNode.height,
                          currentTimeMs
                        )
                        if (scaleLocked) {
                          addKeyframe(
                            selectedNode.id,
                            selectedNode.name,
                            'width',
                            selectedNode.width,
                            currentTimeMs
                          )
                        }
                      }
                    }}
                  />
                </div>
                {/* Aspect lock */}
                {/* oxlint-disable-next-line openweave/no-hardcoded-tip-labels */}
                <Tip label={scaleLocked ? 'Unlock proportions' : 'Constrain proportions'}>
                  <button
                    type="button"
                    className={`flex size-6 cursor-pointer items-center justify-center rounded border transition-colors ${
                      scaleLocked
                        ? 'border-accent/40 bg-accent/10 text-accent'
                        : 'border-border/60 text-muted hover:border-border hover:text-surface'
                    }`}
                    onClick={() => setScaleLocked(!scaleLocked)}
                  >
                    <Link2 className="size-3" />
                  </button>
                </Tip>
                {/* Keyframe Scale Diamond */}
                {(() => {
                  const stateW = getKeyframeState(selectedNode.id, 'width', currentTimeMs, tracks)
                  const stateH = getKeyframeState(selectedNode.id, 'height', currentTimeMs, tracks)
                  const isActive = stateW === 'active' || stateH === 'active'
                  const hasKeyframes = stateW === 'has_keyframes' || stateH === 'has_keyframes'

                  return (
                    /* oxlint-disable-next-line openweave/no-hardcoded-tip-labels */
                    <Tip label={isActive ? 'Remove Scale keyframe' : 'Add Scale keyframe'}>
                      <button
                        type="button"
                        className={`flex size-6 cursor-pointer items-center justify-center rounded border transition-colors ${
                          isActive
                            ? 'border-accent bg-accent text-white shadow-xs'
                            : hasKeyframes
                              ? 'border-accent/60 bg-accent/15 text-accent'
                              : 'border-border/60 text-muted hover:border-border hover:text-surface'
                        }`}
                        onClick={() => {
                          handleToggleKeyframe('width', selectedNode.width ?? 100)
                          handleToggleKeyframe('height', selectedNode.height ?? 100)
                        }}
                      >
                        <Diamond className={`size-3 ${isActive ? 'fill-current' : ''}`} />
                      </button>
                    </Tip>
                  )
                })()}
              </div>
            </div>

            {/* Rotation */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[10px] text-muted">
                <span>Rotation</span>
                <div className="flex items-center gap-0.5">
                  {/* oxlint-disable-next-line openweave/no-hardcoded-tip-labels */}
                  <Tip label="Jump to previous rotation keyframe">
                    <button
                      type="button"
                      className="flex size-4 items-center justify-center text-muted hover:text-surface cursor-pointer disabled:opacity-30"
                      onClick={() => jumpToPropertyKeyframe(selectedNode.id, 'rotation', 'prev')}
                    >
                      <ChevronLeft className="size-2.5" />
                    </button>
                  </Tip>
                  {/* oxlint-disable-next-line openweave/no-hardcoded-tip-labels */}
                  <Tip label="Jump to next rotation keyframe">
                    <button
                      type="button"
                      className="flex size-4 items-center justify-center text-muted hover:text-surface cursor-pointer disabled:opacity-30"
                      onClick={() => jumpToPropertyKeyframe(selectedNode.id, 'rotation', 'next')}
                    >
                      <ChevronRight className="size-2.5" />
                    </button>
                  </Tip>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <NumberField
                    label="°"
                    value={Math.round(selectedNode.rotation ?? 0)}
                    onChange={(val) => {
                      selectedNode.rotation = val
                      store.requestRepaint()
                      if (hasKeyframeAt(selectedNode.id, 'rotation', currentTimeMs)) {
                        addKeyframe(
                          selectedNode.id,
                          selectedNode.name,
                          'rotation',
                          val,
                          currentTimeMs
                        )
                      }
                    }}
                  />
                </div>
                {(() => {
                  const stateRot = getKeyframeState(
                    selectedNode.id,
                    'rotation',
                    currentTimeMs,
                    tracks
                  )
                  const isActive = stateRot === 'active'
                  const hasKeyframes = stateRot === 'has_keyframes'

                  return (
                    /* oxlint-disable-next-line openweave/no-hardcoded-tip-labels */
                    <Tip label={isActive ? 'Remove Rotation keyframe' : 'Add Rotation keyframe'}>
                      <button
                        type="button"
                        data-test-id="keyframe-rotation-toggle"
                        className={`flex size-6 cursor-pointer items-center justify-center rounded border transition-colors ${
                          isActive
                            ? 'border-accent bg-accent text-white shadow-xs'
                            : hasKeyframes
                              ? 'border-accent/60 bg-accent/15 text-accent'
                              : 'border-border/60 text-muted hover:border-border hover:text-surface'
                        }`}
                        onClick={() => handleToggleKeyframe('rotation', selectedNode.rotation ?? 0)}
                      >
                        <Diamond className={`size-3 ${isActive ? 'fill-current' : ''}`} />
                      </button>
                    </Tip>
                  )
                })()}
              </div>
            </div>
          </div>

          {/* Layout Section */}
          <div className="p-3 space-y-2.5 border-b border-border/40">
            <div className="flex items-center justify-between text-[11px] font-semibold text-surface">
              <span>Layout</span>
            </div>

            {/* Flow segmented buttons: None / Vertical / Horizontal / Wrap */}
            <div className="space-y-1">
              <div className="text-[10px] text-muted">Flow</div>
              <div className="flex items-center rounded-lg border border-border/50 bg-background/40 p-0.5">
                {/* oxlint-disable-next-line openweave/no-hardcoded-tip-labels */}
                <Tip label="None / Absolute Flow">
                  <button
                    type="button"
                    aria-label="None / Absolute Flow"
                    className={`flex-1 flex items-center justify-center py-1 rounded text-xs transition-colors cursor-pointer ${
                      (selectedNode.layoutMode ?? 'NONE') === 'NONE'
                        ? 'bg-panel text-surface font-semibold shadow-xs'
                        : 'text-muted hover:text-surface'
                    }`}
                    onClick={() => {
                      selectedNode.layoutMode = 'NONE'
                      store.requestRepaint()
                    }}
                  >
                    <Minus className="size-3 rotate-90" />
                  </button>
                </Tip>
                {/* oxlint-disable-next-line openweave/no-hardcoded-tip-labels */}
                <Tip label="Vertical Layout Flow">
                  <button
                    type="button"
                    aria-label="Vertical Layout Flow"
                    className={`flex-1 flex items-center justify-center py-1 rounded text-xs transition-colors cursor-pointer ${
                      selectedNode.layoutMode === 'VERTICAL'
                        ? 'bg-panel text-surface font-semibold shadow-xs'
                        : 'text-muted hover:text-surface'
                    }`}
                    onClick={() => {
                      selectedNode.layoutMode = 'VERTICAL'
                      store.requestRepaint()
                    }}
                  >
                    <ArrowDown className="size-3" />
                  </button>
                </Tip>
                {/* oxlint-disable-next-line openweave/no-hardcoded-tip-labels */}
                <Tip label="Horizontal Layout Flow">
                  <button
                    type="button"
                    aria-label="Horizontal Layout Flow"
                    className={`flex-1 flex items-center justify-center py-1 rounded text-xs transition-colors cursor-pointer ${
                      selectedNode.layoutMode === 'HORIZONTAL'
                        ? 'bg-panel text-surface font-semibold shadow-xs'
                        : 'text-muted hover:text-surface'
                    }`}
                    onClick={() => {
                      selectedNode.layoutMode = 'HORIZONTAL'
                      store.requestRepaint()
                    }}
                  >
                    <ArrowRight className="size-3" />
                  </button>
                </Tip>
                {/* oxlint-disable-next-line openweave/no-hardcoded-tip-labels */}
                <Tip label="Wrap Flow">
                  <button
                    type="button"
                    aria-label="Wrap Flow"
                    className={`flex-1 flex items-center justify-center py-1 rounded text-xs transition-colors cursor-pointer ${
                      selectedNode.layoutWrap === 'WRAP'
                        ? 'bg-panel text-surface font-semibold shadow-xs'
                        : 'text-muted hover:text-surface'
                    }`}
                    onClick={() => {
                      selectedNode.layoutWrap =
                        selectedNode.layoutWrap === 'WRAP' ? 'NO_WRAP' : 'WRAP'
                      store.requestRepaint()
                    }}
                  >
                    <CornerDownLeft className="size-3" />
                  </button>
                </Tip>
              </div>
            </div>

            {/* Dimensions W & H */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[10px] text-muted">
                <span>Dimensions</span>
                <div className="flex items-center gap-0.5">
                  {/* oxlint-disable-next-line openweave/no-hardcoded-tip-labels */}
                  <Tip label="Jump to previous size keyframe">
                    <button
                      type="button"
                      className="flex size-4 items-center justify-center text-muted hover:text-surface cursor-pointer"
                      onClick={() => jumpToPropertyKeyframe(selectedNode.id, 'width', 'prev')}
                    >
                      <ChevronLeft className="size-2.5" />
                    </button>
                  </Tip>
                  {/* oxlint-disable-next-line openweave/no-hardcoded-tip-labels */}
                  <Tip label="Jump to next size keyframe">
                    <button
                      type="button"
                      className="flex size-4 items-center justify-center text-muted hover:text-surface cursor-pointer"
                      onClick={() => jumpToPropertyKeyframe(selectedNode.id, 'width', 'next')}
                    >
                      <ChevronRight className="size-2.5" />
                    </button>
                  </Tip>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 grid grid-cols-2 gap-1.5">
                  <NumberField
                    label="W"
                    value={Math.round(selectedNode.width ?? 100)}
                    onChange={(val) => {
                      selectedNode.width = val
                      store.requestRepaint()
                      if (hasKeyframeAt(selectedNode.id, 'width', currentTimeMs)) {
                        addKeyframe(selectedNode.id, selectedNode.name, 'width', val, currentTimeMs)
                      }
                    }}
                  />
                  <NumberField
                    label="H"
                    value={Math.round(selectedNode.height ?? 100)}
                    onChange={(val) => {
                      selectedNode.height = val
                      store.requestRepaint()
                      if (hasKeyframeAt(selectedNode.id, 'height', currentTimeMs)) {
                        addKeyframe(
                          selectedNode.id,
                          selectedNode.name,
                          'height',
                          val,
                          currentTimeMs
                        )
                      }
                    }}
                  />
                </div>
                {(() => {
                  const stateW = getKeyframeState(selectedNode.id, 'width', currentTimeMs, tracks)
                  const stateH = getKeyframeState(selectedNode.id, 'height', currentTimeMs, tracks)
                  const isActive = stateW === 'active' || stateH === 'active'
                  const hasKeyframes = stateW === 'has_keyframes' || stateH === 'has_keyframes'

                  return (
                    /* oxlint-disable-next-line openweave/no-hardcoded-tip-labels */
                    <Tip label={isActive ? 'Remove Size keyframe' : 'Add Size keyframe'}>
                      <button
                        type="button"
                        data-test-id="keyframe-size-toggle"
                        className={`flex size-6 cursor-pointer items-center justify-center rounded border transition-colors ${
                          isActive
                            ? 'border-accent bg-accent text-white shadow-xs'
                            : hasKeyframes
                              ? 'border-accent/60 bg-accent/15 text-accent'
                              : 'border-border/60 text-muted hover:border-border hover:text-surface'
                        }`}
                        onClick={() => {
                          handleToggleKeyframe('width', selectedNode.width ?? 100)
                          handleToggleKeyframe('height', selectedNode.height ?? 100)
                        }}
                      >
                        <Diamond className={`size-3 ${isActive ? 'fill-current' : ''}`} />
                      </button>
                    </Tip>
                  )
                })()}
              </div>
            </div>

            {/* Clip content checkbox */}
            <label className="flex items-center gap-2 text-[11px] text-surface cursor-pointer pt-0.5 select-none">
              <input
                type="checkbox"
                checked={!!selectedNode.clipsContent}
                className="rounded border-border accent-accent cursor-pointer"
                onChange={(e) => {
                  selectedNode.clipsContent = e.target.checked
                  store.requestRepaint()
                }}
              />
              <span>Clip content</span>
            </label>
          </div>

          {/* Appearance Section */}
          <div className="p-3 space-y-2.5 border-b border-border/40">
            <div className="flex items-center justify-between text-[11px] font-semibold text-surface">
              <span>Appearance</span>
            </div>

            {/* Opacity */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[10px] text-muted">
                <span>Opacity</span>
                <div className="flex items-center gap-0.5">
                  {/* oxlint-disable-next-line openweave/no-hardcoded-tip-labels */}
                  <Tip label="Jump to previous opacity keyframe">
                    <button
                      type="button"
                      className="flex size-4 items-center justify-center text-muted hover:text-surface cursor-pointer"
                      onClick={() => jumpToPropertyKeyframe(selectedNode.id, 'opacity', 'prev')}
                    >
                      <ChevronLeft className="size-2.5" />
                    </button>
                  </Tip>
                  {/* oxlint-disable-next-line openweave/no-hardcoded-tip-labels */}
                  <Tip label="Jump to next opacity keyframe">
                    <button
                      type="button"
                      className="flex size-4 items-center justify-center text-muted hover:text-surface cursor-pointer"
                      onClick={() => jumpToPropertyKeyframe(selectedNode.id, 'opacity', 'next')}
                    >
                      <ChevronRight className="size-2.5" />
                    </button>
                  </Tip>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <NumberField
                    label="%"
                    value={Math.round((selectedNode.opacity ?? 1) * 100)}
                    min={0}
                    max={100}
                    onChange={(val) => {
                      const norm = val / 100
                      selectedNode.opacity = norm
                      store.requestRepaint()
                      if (hasKeyframeAt(selectedNode.id, 'opacity', currentTimeMs)) {
                        addKeyframe(
                          selectedNode.id,
                          selectedNode.name,
                          'opacity',
                          norm,
                          currentTimeMs
                        )
                      }
                    }}
                  />
                </div>
                {(() => {
                  const stateOp = getKeyframeState(
                    selectedNode.id,
                    'opacity',
                    currentTimeMs,
                    tracks
                  )
                  const isActive = stateOp === 'active'
                  const hasKeyframes = stateOp === 'has_keyframes'

                  return (
                    /* oxlint-disable-next-line openweave/no-hardcoded-tip-labels */
                    <Tip label={isActive ? 'Remove Opacity keyframe' : 'Add Opacity keyframe'}>
                      <button
                        type="button"
                        data-test-id="keyframe-opacity-toggle"
                        className={`flex size-6 cursor-pointer items-center justify-center rounded border transition-colors ${
                          isActive
                            ? 'border-accent bg-accent text-white shadow-xs'
                            : hasKeyframes
                              ? 'border-accent/60 bg-accent/15 text-accent'
                              : 'border-border/60 text-muted hover:border-border hover:text-surface'
                        }`}
                        onClick={() => handleToggleKeyframe('opacity', selectedNode.opacity ?? 1)}
                      >
                        <Diamond className={`size-3 ${isActive ? 'fill-current' : ''}`} />
                      </button>
                    </Tip>
                  )
                })()}
              </div>
            </div>

            {/* Corner Radius */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[10px] text-muted">
                <span>Corner radius</span>
                <div className="flex items-center gap-0.5">
                  {/* oxlint-disable-next-line openweave/no-hardcoded-tip-labels */}
                  <Tip label="Jump to previous radius keyframe">
                    <button
                      type="button"
                      className="flex size-4 items-center justify-center text-muted hover:text-surface cursor-pointer"
                      onClick={() =>
                        jumpToPropertyKeyframe(selectedNode.id, 'cornerRadius', 'prev')
                      }
                    >
                      <ChevronLeft className="size-2.5" />
                    </button>
                  </Tip>
                  {/* oxlint-disable-next-line openweave/no-hardcoded-tip-labels */}
                  <Tip label="Jump to next radius keyframe">
                    <button
                      type="button"
                      className="flex size-4 items-center justify-center text-muted hover:text-surface cursor-pointer"
                      onClick={() =>
                        jumpToPropertyKeyframe(selectedNode.id, 'cornerRadius', 'next')
                      }
                    >
                      <ChevronRight className="size-2.5" />
                    </button>
                  </Tip>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <NumberField
                    label="R"
                    value={Math.round(selectedNode.cornerRadius ?? 0)}
                    min={0}
                    onChange={(val) => {
                      selectedNode.cornerRadius = val
                      store.requestRepaint()
                      if (hasKeyframeAt(selectedNode.id, 'cornerRadius', currentTimeMs)) {
                        addKeyframe(
                          selectedNode.id,
                          selectedNode.name,
                          'cornerRadius',
                          val,
                          currentTimeMs
                        )
                      }
                    }}
                  />
                </div>
                {(() => {
                  const stateRad = getKeyframeState(
                    selectedNode.id,
                    'cornerRadius',
                    currentTimeMs,
                    tracks
                  )
                  const isActive = stateRad === 'active'
                  const hasKeyframes = stateRad === 'has_keyframes'

                  return (
                    /* oxlint-disable-next-line openweave/no-hardcoded-tip-labels */
                    <Tip
                      label={
                        isActive ? 'Remove Corner radius keyframe' : 'Add Corner radius keyframe'
                      }
                    >
                      <button
                        type="button"
                        data-test-id="keyframe-radius-toggle"
                        className={`flex size-6 cursor-pointer items-center justify-center rounded border transition-colors ${
                          isActive
                            ? 'border-accent bg-accent text-white shadow-xs'
                            : hasKeyframes
                              ? 'border-accent/60 bg-accent/15 text-accent'
                              : 'border-border/60 text-muted hover:border-border hover:text-surface'
                        }`}
                        onClick={() =>
                          handleToggleKeyframe('cornerRadius', selectedNode.cornerRadius ?? 0)
                        }
                      >
                        <Diamond className={`size-3 ${isActive ? 'fill-current' : ''}`} />
                      </button>
                    </Tip>
                  )
                })()}
              </div>
            </div>
          </div>

          {/* Fill Section */}
          <div className="p-3 space-y-2 border-b border-border/40">
            <div className="flex items-center justify-between text-[11px] font-semibold text-surface">
              <span>Fill</span>
              {/* oxlint-disable-next-line openweave/no-hardcoded-tip-labels */}
              <Tip label="Add fill">
                <button
                  type="button"
                  className="flex size-5 items-center justify-center rounded text-muted hover:bg-hover hover:text-surface transition-colors cursor-pointer"
                  onClick={() => {
                    if (!selectedNode.fills) selectedNode.fills = []
                    selectedNode.fills.push({
                      type: 'SOLID',
                      color: { r: 1, g: 1, b: 1, a: 1 },
                      opacity: 1,
                      visible: true
                    })
                    store.requestRepaint()
                  }}
                >
                  <Plus className="size-3.5" />
                </button>
              </Tip>
            </div>

            {(() => {
              const firstFill = selectedNode.fills?.[0]
              const fillHex = firstFill?.color ? colorToHexRaw(firstFill.color) : 'FFFFFF'
              const fillOpacity = Math.round((firstFill?.opacity ?? 1) * 100)

              return (
                <div className="flex items-center gap-2 rounded-lg border border-border/50 bg-background/40 p-1.5">
                  {/* Swatch */}
                  <div
                    className="size-5 rounded border border-white/20 shadow-xs shrink-0"
                    style={{
                      backgroundColor: `#${fillHex}`
                    }}
                  />

                  {/* Hex */}
                  <span className="flex-1 font-mono text-xs text-surface uppercase">
                    #{fillHex}
                  </span>

                  {/* Opacity */}
                  <span className="font-mono text-[11px] text-muted">{fillOpacity}%</span>

                  {/* Keyframe diamond */}
                  {/* oxlint-disable-next-line openweave/no-hardcoded-tip-labels */}
                  <Tip label="Keyframe fill opacity">
                    <button
                      type="button"
                      className="flex size-5 items-center justify-center text-muted hover:text-surface transition-colors cursor-pointer"
                      onClick={() => handleToggleKeyframe('opacity', firstFill?.opacity ?? 1)}
                    >
                      <Diamond className="size-3" />
                    </button>
                  </Tip>

                  {/* Visibility eye */}
                  {/* oxlint-disable-next-line openweave/no-hardcoded-tip-labels */}
                  <Tip label={firstFill?.visible !== false ? 'Hide fill' : 'Show fill'}>
                    <button
                      type="button"
                      className="flex size-5 items-center justify-center text-muted hover:text-surface transition-colors cursor-pointer"
                      onClick={() => {
                        if (firstFill) {
                          firstFill.visible = firstFill.visible === false ? true : false
                          store.requestRepaint()
                        }
                      }}
                    >
                      <Eye
                        className={`size-3 ${firstFill?.visible === false ? 'opacity-40' : ''}`}
                      />
                    </button>
                  </Tip>
                </div>
              )
            })()}
          </div>

          {/* Figma 1-Click Motion Presets */}
          <div className="p-3 space-y-2">
            <div className="flex items-center justify-between text-[11px] font-semibold text-surface">
              <span className="flex items-center gap-1.5">
                <Sparkles className="size-3 text-accent" />
                <span>1-Click Presets</span>
              </span>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {MOTION_PRESET_ITEMS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  className="flex flex-col items-start gap-1 rounded-lg border border-border/50 bg-background/40 p-2 text-left transition-all hover:border-accent hover:bg-accent/5 hover:shadow-xs cursor-pointer group"
                  onClick={() => applyMotionPreset(selectedNode.id, preset.id)}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="font-semibold text-surface text-[11px] flex items-center gap-1 group-hover:text-accent transition-colors">
                      <Wand2 className="size-2.5 text-accent" />
                      {preset.label}
                    </span>
                    <span className="text-[9px] text-muted/80 font-mono">{preset.category}</span>
                  </div>
                  <span className="text-[10px] text-muted leading-tight">{preset.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Figma Dev Mode Style Code Export */}
          <div className="p-3 space-y-2">
            <div className="flex items-center justify-between text-[11px] font-semibold text-surface">
              <div className="flex items-center gap-1.5">
                <Code className="size-3 text-accent" />
                <span>Developer Handoff</span>
              </div>
              <button
                type="button"
                className="flex items-center gap-1 rounded-md bg-accent px-2 py-0.5 text-[10px] font-medium text-white hover:bg-accent/90 cursor-pointer transition-colors shadow-xs"
                onClick={handleCopyCode}
              >
                {copied ? <Check className="size-2.5" /> : <Copy className="size-2.5" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>

            {/* Format toggle tabs */}
            <div className="flex gap-1 rounded-lg bg-background/60 p-0.5 text-[10px] border border-border/30">
              {(['framer', 'css', 'waapi'] as const).map((fmt) => (
                <button
                  key={fmt}
                  type="button"
                  className={`flex-1 rounded-md py-1 text-center transition-all cursor-pointer font-medium ${
                    exportFormat === fmt
                      ? 'bg-panel text-surface shadow-xs border border-border/40 font-semibold'
                      : 'text-muted hover:text-surface'
                  }`}
                  onClick={() => setExportFormat(fmt)}
                >
                  {fmt === 'framer' ? 'Framer' : fmt === 'css' ? 'CSS' : 'WAAPI'}
                </button>
              ))}
            </div>

            {/* Code preview block */}
            <pre className="max-h-36 overflow-auto rounded-lg bg-background/90 p-2.5 font-mono text-[10px] leading-relaxed text-muted select-all border border-border/40 shadow-inner scrollbar-thin">
              {exportedCode || '// Add keyframes to preview code'}
            </pre>
          </div>
        </>
      )}
    </div>
  )
}
