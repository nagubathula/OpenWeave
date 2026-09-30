import { useStore } from '@nanostores/react'
import {
  Maximize2,
  Minus,
  Pause,
  Play,
  Plus,
  Repeat,
  RotateCcw,
  SkipBack,
  SkipForward,
  X
} from 'lucide-react'
import React, { useState } from 'react'

import {
  jumpToNextKeyframe,
  jumpToPreviousKeyframe,
  seek,
  setDuration,
  setLoop,
  setPlaybackSpeed,
  setZoom,
  timelineStore,
  togglePlay,
  toggleRecording
} from '@/app/motion/store'
import Tip from '@/components/ui/Tip'

interface ControlsProps {
  onClose?: () => void
  onZoomToFit?: () => void
}

export default function Controls({ onClose, onZoomToFit }: ControlsProps) {
  const {
    currentTimeMs,
    durationMs,
    isPlaying,
    zoom,
    loop,
    isRecording,
    playbackSpeed = 1
  } = useStore(timelineStore)
  const [editingDuration, setEditingDuration] = useState(false)
  const [tempDuration, setTempDuration] = useState(String(durationMs))

  const nextSpeed = playbackSpeed === 0.5 ? 1 : playbackSpeed === 1 ? 2 : 0.5

  const handleDurationSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const val = parseInt(tempDuration, 10)
    if (!Number.isNaN(val) && val >= 200) {
      setDuration(val)
    } else {
      setTempDuration(String(durationMs))
    }
    setEditingDuration(false)
  }

  return (
    <div
      data-test-id="timeline-controls"
      className="flex h-8 shrink-0 items-center justify-between border-t border-border bg-panel px-3 text-xs select-none"
    >
      {/* Left group: Transport & Recording */}
      <div className="flex items-center gap-1">
        {/* Record dot */}
        {/* oxlint-disable-next-line openweave/no-hardcoded-tip-labels */}
        <Tip label={isRecording ? 'Stop recording keyframes' : 'Auto-record keyframes'}>
          <button
            type="button"
            data-test-id="timeline-record-button"
            aria-label="Toggle recording"
            className={`flex size-6 cursor-pointer items-center justify-center rounded transition-colors ${
              isRecording
                ? 'text-red-500 bg-red-500/15 hover:bg-red-500/25'
                : 'text-muted hover:text-surface hover:bg-hover'
            }`}
            onClick={() => toggleRecording()}
          >
            <div
              className={`size-2.5 rounded-full transition-all ${
                isRecording
                  ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.9)] animate-pulse'
                  : 'bg-current'
              }`}
            />
          </button>
        </Tip>

        <div className="mx-1 h-3.5 w-px bg-border" />

        {/* Go to start */}
        {/* oxlint-disable-next-line openweave/no-hardcoded-tip-labels */}
        <Tip label="Go to start (Home)">
          <button
            type="button"
            data-test-id="timeline-reset-button"
            aria-label="Go to start"
            className="flex size-6 cursor-pointer items-center justify-center rounded text-muted transition-colors hover:bg-hover hover:text-surface"
            onClick={() => seek(0)}
          >
            <RotateCcw className="size-3" />
          </button>
        </Tip>

        {/* Previous keyframe */}
        {/* oxlint-disable-next-line openweave/no-hardcoded-tip-labels */}
        <Tip label="Previous keyframe (J)">
          <button
            type="button"
            aria-label="Previous keyframe"
            className="flex size-6 cursor-pointer items-center justify-center rounded text-muted transition-colors hover:bg-hover hover:text-surface"
            onClick={jumpToPreviousKeyframe}
          >
            <SkipBack className="size-3" />
          </button>
        </Tip>

        {/* Play / Pause */}
        {/* oxlint-disable-next-line openweave/no-hardcoded-tip-labels */}
        <Tip label={isPlaying ? 'Pause (Space)' : 'Play (Space)'}>
          <button
            type="button"
            data-test-id="timeline-play-button"
            aria-label={isPlaying ? 'Pause' : 'Play'}
            className="mx-0.5 flex size-6 cursor-pointer items-center justify-center rounded bg-accent/15 text-accent hover:bg-accent hover:text-white transition-colors border border-accent/20"
            onClick={togglePlay}
          >
            {isPlaying ? (
              <Pause className="size-3 fill-current" />
            ) : (
              <Play className="size-3 fill-current ml-px" />
            )}
          </button>
        </Tip>

        {/* Next keyframe */}
        {/* oxlint-disable-next-line openweave/no-hardcoded-tip-labels */}
        <Tip label="Next keyframe (K)">
          <button
            type="button"
            aria-label="Next keyframe"
            className="flex size-6 cursor-pointer items-center justify-center rounded text-muted transition-colors hover:bg-hover hover:text-surface"
            onClick={jumpToNextKeyframe}
          >
            <SkipForward className="size-3" />
          </button>
        </Tip>

        <div className="mx-1 h-3.5 w-px bg-border" />

        {/* Time display & editable duration */}
        {editingDuration ? (
          <form onSubmit={handleDurationSubmit} className="flex items-center gap-1">
            <input
              type="text"
              autoFocus
              value={tempDuration}
              className="w-14 rounded border border-border bg-input px-1.5 py-0.5 font-mono text-[11px] text-surface outline-none focus:border-accent"
              onChange={(e) => setTempDuration(e.target.value)}
              onBlur={() => setEditingDuration(false)}
            />
            <span className="font-mono text-[10px] text-muted">ms</span>
          </form>
        ) : (
          /* oxlint-disable-next-line openweave/no-hardcoded-tip-labels */
          <Tip label="Click to edit sequence duration">
            <button
              type="button"
              data-test-id="timeline-time-display"
              className="flex items-center gap-1.5 rounded-md border border-border bg-panel-field px-2.5 py-0.5 font-mono text-[11px] hover:bg-hover cursor-pointer transition-colors shadow-2xs"
              onClick={() => {
                setTempDuration(String(durationMs))
                setEditingDuration(true)
              }}
            >
              <span className="text-surface font-semibold tabular-nums">
                {Math.round(currentTimeMs)}
              </span>
              <span className="text-muted tabular-nums">/ {durationMs} ms</span>
            </button>
          </Tip>
        )}
      </div>

      {/* Right group: Speed, Zoom & Utilities */}
      <div className="flex items-center gap-2">
        {/* Playback speed */}
        {/* oxlint-disable-next-line openweave/no-hardcoded-tip-labels */}
        <Tip label={`Playback speed: ${playbackSpeed}× (click to toggle)`}>
          <button
            type="button"
            aria-label="Playback speed"
            className="h-5.5 rounded border border-border bg-panel-field px-2 font-mono text-[10px] font-semibold text-muted hover:text-surface hover:bg-hover cursor-pointer transition-colors"
            onClick={() => setPlaybackSpeed(nextSpeed)}
          >
            {playbackSpeed}×
          </button>
        </Tip>

        {/* Loop Toggle */}
        {/* oxlint-disable-next-line openweave/no-hardcoded-tip-labels */}
        <Tip label={loop ? 'Loop enabled' : 'Loop disabled'}>
          <button
            type="button"
            data-test-id="timeline-loop-toggle"
            aria-label="Loop"
            className={`flex size-6 cursor-pointer items-center justify-center rounded transition-colors ${
              loop ? 'text-accent bg-accent/15' : 'text-muted hover:bg-hover hover:text-surface'
            }`}
            onClick={() => setLoop(!loop)}
          >
            <Repeat className="size-3" />
          </button>
        </Tip>

        <div className="h-3.5 w-px bg-border/80" />

        {/* Zoom to fit */}
        {onZoomToFit && (
          /* oxlint-disable-next-line openweave/no-hardcoded-tip-labels */
          <Tip label="Zoom to fit (Shift+1)">
            <button
              type="button"
              data-test-id="timeline-zoom-fit"
              aria-label="Zoom to fit"
              className="size-6 flex items-center justify-center rounded text-muted hover:text-surface hover:bg-hover transition-colors cursor-pointer"
              onClick={onZoomToFit}
            >
              <Maximize2 className="size-3" />
            </button>
          </Tip>
        )}

        {/* Zoom Out button */}
        {/* oxlint-disable-next-line openweave/no-hardcoded-tip-labels */}
        <Tip label="Zoom out (-)">
          <button
            type="button"
            data-test-id="timeline-zoom-out"
            aria-label="Zoom out"
            className="size-6 flex items-center justify-center rounded text-muted hover:text-surface hover:bg-hover transition-colors cursor-pointer"
            onClick={() => setZoom(Math.max(0.2, Number((zoom - 0.2).toFixed(2))))}
          >
            <Minus className="size-3" />
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
          className="h-1.5 w-20 cursor-pointer appearance-none rounded-full bg-border accent-accent outline-none"
          onChange={(e) => setZoom(Number(parseFloat(e.target.value).toFixed(2)))}
        />

        {/* Zoom In button */}
        {/* oxlint-disable-next-line openweave/no-hardcoded-tip-labels */}
        <Tip label="Zoom in (+)">
          <button
            type="button"
            data-test-id="timeline-zoom-in"
            aria-label="Zoom in"
            className="size-6 flex items-center justify-center rounded text-muted hover:text-surface hover:bg-hover transition-colors cursor-pointer"
            onClick={() => setZoom(Math.min(2.5, Number((zoom + 0.2).toFixed(2))))}
          >
            <Plus className="size-3" />
          </button>
        </Tip>

        {/* Close Timeline button */}
        {onClose && (
          <>
            <div className="h-3.5 w-px bg-border/80" />
            {/* oxlint-disable-next-line openweave/no-hardcoded-tip-labels */}
            <Tip label="Close timeline">
              <button
                type="button"
                data-test-id="timeline-close-button"
                aria-label="Close timeline"
                className="flex size-6 cursor-pointer items-center justify-center rounded text-muted transition-colors hover:bg-hover hover:text-surface"
                onClick={onClose}
              >
                <X className="size-3.5" />
              </button>
            </Tip>
          </>
        )}
      </div>
    </div>
  )
}
