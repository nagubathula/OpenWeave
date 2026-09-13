import { useStore } from '@nanostores/react'
import {
  Pause,
  Play,
  Repeat,
  RotateCcw,
  SkipBack,
  SkipForward,
  X,
  ZoomIn,
  ZoomOut
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
}

export default function Controls({ onClose }: ControlsProps) {
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
      className="flex h-8 shrink-0 items-center justify-between border-t border-white/[0.06] bg-[#111113] px-3 text-xs select-none"
    >
      {/* Left group */}
      <div className="flex items-center gap-1">
        {/* Record dot */}
        {/* oxlint-disable-next-line openweave/no-hardcoded-tip-labels */}
        <Tip label={isRecording ? 'Stop recording' : 'Record keyframes'}>
          <button
            type="button"
            data-test-id="timeline-record-button"
            aria-label="Toggle recording"
            className={`flex size-5 cursor-pointer items-center justify-center rounded transition-colors ${
              isRecording
                ? 'text-red-500 hover:bg-white/5'
                : 'text-white/30 hover:text-white/60 hover:bg-white/5'
            }`}
            onClick={() => toggleRecording()}
          >
            <div
              className={`size-2 rounded-full ${
                isRecording ? 'bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.8)]' : 'bg-current'
              }`}
            />
          </button>
        </Tip>

        <div className="mx-1 h-3.5 w-px bg-white/[0.08]" />

        {/* Go to start */}
        {/* oxlint-disable-next-line openweave/no-hardcoded-tip-labels */}
        <Tip label="Go to start (Home)">
          <button
            type="button"
            data-test-id="timeline-reset-button"
            aria-label="Go to start"
            className="flex size-5 cursor-pointer items-center justify-center rounded text-white/40 transition-colors hover:bg-white/5 hover:text-white/80"
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
            className="flex size-5 cursor-pointer items-center justify-center rounded text-white/40 transition-colors hover:bg-white/5 hover:text-white/80"
            onClick={jumpToPreviousKeyframe}
          >
            <SkipBack className="size-3" />
          </button>
        </Tip>

        {/* Play / Pause */}
        <Tip label={isPlaying ? 'Pause (Space)' : 'Play (Space)'}>
          <button
            type="button"
            data-test-id="timeline-play-button"
            aria-label={isPlaying ? 'Pause' : 'Play'}
            className="mx-0.5 flex size-6 cursor-pointer items-center justify-center rounded bg-white/10 text-white transition-colors hover:bg-white/20"
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
            className="flex size-5 cursor-pointer items-center justify-center rounded text-white/40 transition-colors hover:bg-white/5 hover:text-white/80"
            onClick={jumpToNextKeyframe}
          >
            <SkipForward className="size-3" />
          </button>
        </Tip>

        <div className="mx-1 h-3.5 w-px bg-white/[0.08]" />

        {/* Time display */}
        {editingDuration ? (
          <form onSubmit={handleDurationSubmit} className="flex items-center gap-1">
            <input
              type="text"
              autoFocus
              value={tempDuration}
              className="w-14 rounded border border-white/10 bg-white/5 px-1.5 py-0.5 font-mono text-[11px] text-white outline-none focus:border-accent"
              onChange={(e) => setTempDuration(e.target.value)}
              onBlur={() => setEditingDuration(false)}
            />
            <span className="font-mono text-[10px] text-white/30">ms</span>
          </form>
        ) : (
          /* oxlint-disable-next-line openweave/no-hardcoded-tip-labels */
          <Tip label="Click to edit duration">
            <button
              type="button"
              data-test-id="timeline-time-display"
              className="flex items-center gap-1.5 rounded-md border border-white/10 bg-[#1e1e22] px-2 py-0.5 font-mono text-[11px] hover:bg-white/10 cursor-pointer transition-colors shadow-sm"
              onClick={() => {
                setTempDuration(String(durationMs))
                setEditingDuration(true)
              }}
            >
              <span className="text-white font-medium tabular-nums">
                {Math.round(currentTimeMs)}
              </span>
              <span className="text-white/40 tabular-nums">{durationMs} ms</span>
              <Repeat className={`size-2.5 ${loop ? 'text-accent' : 'text-white/30'}`} />
            </button>
          </Tip>
        )}
      </div>

      {/* Right group */}
      <div className="flex items-center gap-1.5">
        {/* Playback speed */}
        {/* oxlint-disable-next-line openweave/no-hardcoded-tip-labels */}
        <Tip label={`Speed: ${playbackSpeed}x — click to cycle`}>
          <button
            type="button"
            aria-label="Playback speed"
            className="h-5 rounded border border-white/10 bg-white/5 px-1.5 font-mono text-[9px] font-semibold text-white/50 hover:text-white/80 hover:bg-white/10 cursor-pointer transition-colors"
            onClick={() => setPlaybackSpeed(nextSpeed)}
          >
            {playbackSpeed}×
          </button>
        </Tip>

        {/* Loop */}
        <Tip label={loop ? 'Loop enabled' : 'Loop disabled'}>
          <button
            type="button"
            data-test-id="timeline-loop-toggle"
            aria-label="Loop"
            className={`flex size-5 cursor-pointer items-center justify-center rounded transition-colors ${
              loop
                ? 'text-accent bg-accent/15'
                : 'text-white/30 hover:bg-white/5 hover:text-white/70'
            }`}
            onClick={() => setLoop(!loop)}
          >
            <Repeat className="size-3" />
          </button>
        </Tip>

        {/* Zoom slider */}
        <div className="flex items-center gap-1 text-white/25">
          <ZoomOut className="size-3" />
          <input
            type="range"
            min={0.4}
            max={2.5}
            step={0.1}
            value={zoom}
            aria-label="Timeline zoom"
            className="h-1 w-16 cursor-pointer accent-accent"
            onChange={(e) => setZoom(parseFloat(e.target.value))}
          />
          <ZoomIn className="size-3" />
        </div>

        {onClose && (
          /* oxlint-disable-next-line openweave/no-hardcoded-tip-labels */
          <Tip label="Close timeline">
            <button
              type="button"
              data-test-id="timeline-close-button"
              aria-label="Close timeline"
              className="flex size-5 cursor-pointer items-center justify-center rounded text-white/30 transition-colors hover:bg-white/5 hover:text-white/70"
              onClick={onClose}
            >
              <X className="size-3" />
            </button>
          </Tip>
        )}
      </div>
    </div>
  )
}
