import { useStore } from '@nanostores/react'
import { Pause, Play, Repeat, RotateCcw, X, ZoomIn, ZoomOut } from 'lucide-react'
import React from 'react'

import { seek, setLoop, setZoom, timelineStore, togglePlay } from '@/app/motion/store'
import Tip from '@/components/ui/Tip'

interface ControlsProps {
  onClose?: () => void
}

export default function Controls({ onClose }: ControlsProps) {
  const { currentTimeMs, durationMs, isPlaying, zoom, loop } = useStore(timelineStore)

  const formattedTime = `${String(Math.round(currentTimeMs)).padStart(4, '0')} ${durationMs} ms`

  return (
    <div
      data-test-id="timeline-controls"
      className="flex h-9 shrink-0 items-center justify-between border-t border-border/40 bg-panel px-3 text-xs"
    >
      {/* Left: Playback controls & time display */}
      <div className="flex items-center gap-2">
        <Tip label={isPlaying ? 'Pause (Space)' : 'Play (Space)'}>
          <button
            type="button"
            data-test-id="timeline-play-button"
            aria-label={isPlaying ? 'Pause' : 'Play'}
            className="flex size-6 cursor-pointer items-center justify-center rounded text-surface transition-colors hover:bg-hover hover:text-white"
            onClick={togglePlay}
          >
            {isPlaying ? (
              <Pause className="size-3.5 fill-current" />
            ) : (
              <Play className="size-3.5 fill-current ml-0.5" />
            )}
          </button>
        </Tip>

        {/* oxlint-disable-next-line openweave/no-hardcoded-tip-labels */}
        <Tip label="Go to start">
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

        <span
          data-test-id="timeline-time-display"
          className="font-mono text-[11px] text-surface font-medium select-none ml-1"
        >
          {formattedTime}
        </span>
      </div>

      {/* Right: Loop, Zoom slider & Close */}
      <div className="flex items-center gap-3">
        <Tip label={loop ? 'Loop enabled' : 'Loop disabled'}>
          <button
            type="button"
            data-test-id="timeline-loop-toggle"
            aria-label="Loop toggle"
            className={`flex size-6 cursor-pointer items-center justify-center rounded transition-colors ${
              loop ? 'text-accent bg-accent/15' : 'text-muted hover:bg-hover hover:text-surface'
            }`}
            onClick={() => setLoop(!loop)}
          >
            <Repeat className="size-3" />
          </button>
        </Tip>

        {/* Zoom scale slider */}
        <div className="flex items-center gap-1.5 text-muted">
          <ZoomOut className="size-3 opacity-60" />
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
          <ZoomIn className="size-3 opacity-60" />
        </div>

        {onClose && (
          /* oxlint-disable-next-line openweave/no-hardcoded-tip-labels */
          <Tip label="Close timeline">
            <button
              type="button"
              data-test-id="timeline-close-button"
              aria-label="Close timeline"
              className="flex size-6 cursor-pointer items-center justify-center rounded text-muted transition-colors hover:bg-hover hover:text-surface ml-1"
              onClick={onClose}
            >
              <X className="size-3.5" />
            </button>
          </Tip>
        )}
      </div>
    </div>
  )
}
