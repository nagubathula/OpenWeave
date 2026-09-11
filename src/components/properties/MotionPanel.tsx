import { useStore } from '@nanostores/react'
import { Diamond, Film, Play } from 'lucide-react'
import React, { useState } from 'react'

import { useSelectionState } from '@openweave/react'
import type { SpringConfig, SpringPreset } from '@openweave/scene-graph'

import { useEditorStore } from '@/app/editor/active-store'
import {
  addKeyframe,
  hasKeyframeAt,
  nodeTracksStore,
  removeKeyframe,
  timelineStore,
  togglePlay
} from '@/app/motion/store'
import type { AnimatableProperty } from '@/app/motion/types'
import NumberField from '@/components/inputs/NumberField'
import SpringCurveEditor from '@/components/prototype/SpringCurveEditor'
import Tip from '@/components/ui/Tip'

export default function MotionPanel() {
  const store = useEditorStore()
  const { currentTimeMs, isPlaying } = useStore(timelineStore)
  const tracks = useStore(nodeTracksStore)
  const { selectedNode } = useSelectionState()
  const [springPreset, setSpringPreset] = useState<SpringPreset>('BOUNCY')
  const [springConfig, setSpringConfig] = useState<SpringConfig>({
    stiffness: 600,
    damping: 15,
    mass: 1
  })

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

  return (
    <div
      data-test-id="motion-panel"
      className="flex flex-1 flex-col overflow-y-auto divide-y divide-border/40 text-xs"
    >
      {/* Top Header matching Figma Motion Beta */}
      <div className="flex items-center justify-between px-3 py-2 bg-panel/60">
        <div className="flex items-center gap-2">
          <Film className="size-4 text-accent" />
          <span className="font-semibold text-surface">Motion</span>
          <span className="rounded bg-accent/20 px-1.5 py-0.5 text-[10px] font-medium text-accent">
            Beta
          </span>
        </div>

        <Tip label={isPlaying ? 'Pause preview' : 'Play preview'}>
          <button
            type="button"
            className="flex size-6 cursor-pointer items-center justify-center rounded text-surface hover:bg-hover hover:text-white"
            onClick={togglePlay}
          >
            <Play className="size-3.5 fill-current" />
          </button>
        </Tip>
      </div>

      {/* Node selection info */}
      {!selectedNode ? (
        <div className="p-4 text-center text-muted">
          <p className="text-[11px] leading-relaxed">
            Select an object on the canvas to animate its transform properties.
          </p>
        </div>
      ) : (
        <>
          {/* Transform Keyframing Section */}
          <div className="p-3 space-y-3">
            <div className="flex items-center justify-between text-[11px] font-medium text-surface">
              <span>Transform</span>
              <span className="font-mono text-[10px] text-muted">
                {Math.round(currentTimeMs)}ms
              </span>
            </div>

            {/* Position X & Y */}
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

              <Tip
                label={
                  hasKeyframeAt(selectedNode.id, 'x', currentTimeMs) ||
                  hasKeyframeAt(selectedNode.id, 'y', currentTimeMs)
                    ? 'Remove Position keyframe'
                    : 'Add Position keyframe'
                }
              >
                <button
                  type="button"
                  data-test-id="keyframe-position-toggle"
                  className={`flex size-6 cursor-pointer items-center justify-center rounded border transition-colors ${
                    hasKeyframeAt(selectedNode.id, 'x', currentTimeMs) ||
                    hasKeyframeAt(selectedNode.id, 'y', currentTimeMs)
                      ? 'border-accent bg-accent text-white'
                      : 'border-border/60 text-muted hover:border-border hover:text-surface'
                  }`}
                  onClick={() => {
                    handleToggleKeyframe('x', selectedNode.x ?? 0)
                    handleToggleKeyframe('y', selectedNode.y ?? 0)
                  }}
                >
                  <Diamond className="size-3 fill-current" />
                </button>
              </Tip>
            </div>

            {/* Dimensions Width & Height */}
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
                      addKeyframe(selectedNode.id, selectedNode.name, 'height', val, currentTimeMs)
                    }
                  }}
                />
              </div>

              <Tip
                label={
                  hasKeyframeAt(selectedNode.id, 'width', currentTimeMs) ||
                  hasKeyframeAt(selectedNode.id, 'height', currentTimeMs)
                    ? 'Remove Size keyframe'
                    : 'Add Size keyframe'
                }
              >
                <button
                  type="button"
                  data-test-id="keyframe-size-toggle"
                  className={`flex size-6 cursor-pointer items-center justify-center rounded border transition-colors ${
                    hasKeyframeAt(selectedNode.id, 'width', currentTimeMs) ||
                    hasKeyframeAt(selectedNode.id, 'height', currentTimeMs)
                      ? 'border-accent bg-accent text-white'
                      : 'border-border/60 text-muted hover:border-border hover:text-surface'
                  }`}
                  onClick={() => {
                    handleToggleKeyframe('width', selectedNode.width ?? 100)
                    handleToggleKeyframe('height', selectedNode.height ?? 100)
                  }}
                >
                  <Diamond className="size-3 fill-current" />
                </button>
              </Tip>
            </div>

            {/* Rotation */}
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

              <Tip
                label={
                  hasKeyframeAt(selectedNode.id, 'rotation', currentTimeMs)
                    ? 'Remove Rotation keyframe'
                    : 'Add Rotation keyframe'
                }
              >
                <button
                  type="button"
                  data-test-id="keyframe-rotation-toggle"
                  className={`flex size-6 cursor-pointer items-center justify-center rounded border transition-colors ${
                    hasKeyframeAt(selectedNode.id, 'rotation', currentTimeMs)
                      ? 'border-accent bg-accent text-white'
                      : 'border-border/60 text-muted hover:border-border hover:text-surface'
                  }`}
                  onClick={() => handleToggleKeyframe('rotation', selectedNode.rotation ?? 0)}
                >
                  <Diamond className="size-3 fill-current" />
                </button>
              </Tip>
            </div>

            {/* Opacity */}
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

              <Tip
                label={
                  hasKeyframeAt(selectedNode.id, 'opacity', currentTimeMs)
                    ? 'Remove Opacity keyframe'
                    : 'Add Opacity keyframe'
                }
              >
                <button
                  type="button"
                  data-test-id="keyframe-opacity-toggle"
                  className={`flex size-6 cursor-pointer items-center justify-center rounded border transition-colors ${
                    hasKeyframeAt(selectedNode.id, 'opacity', currentTimeMs)
                      ? 'border-accent bg-accent text-white'
                      : 'border-border/60 text-muted hover:border-border hover:text-surface'
                  }`}
                  onClick={() => handleToggleKeyframe('opacity', selectedNode.opacity ?? 1)}
                >
                  <Diamond className="size-3 fill-current" />
                </button>
              </Tip>
            </div>
          </div>

          {/* Spring Physics Curve Editor */}
          <div className="p-3 space-y-2">
            <div className="text-[11px] font-medium text-surface">Spring & Easing</div>
            <SpringCurveEditor
              preset={springPreset}
              config={springConfig}
              onPresetChange={setSpringPreset}
              onConfigChange={setSpringConfig}
            />
          </div>
        </>
      )}
    </div>
  )
}
