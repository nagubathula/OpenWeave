import React from 'react'
import { useGradientStops } from '@openweave/react'
import { colorToCSS } from '@openweave/core/color'
import type { Fill, FillType, ImageScaleMode } from '@openweave/scene-graph'
import type { Color } from '@openweave/scene-graph/primitives'
import ColorSwatchPopover from '@/components/color-picker/ColorSwatchPopover'
import Tip from '@/components/ui/Tip'

const FILL_TYPE_OPTIONS: { value: FillType; label: string }[] = [
  { value: 'SOLID', label: 'Solid' },
  { value: 'GRADIENT_LINEAR', label: 'Linear' },
  { value: 'GRADIENT_RADIAL', label: 'Radial' },
  { value: 'GRADIENT_ANGULAR', label: 'Angular' },
  { value: 'GRADIENT_DIAMOND', label: 'Diamond' },
  { value: 'IMAGE', label: 'Image' }
]

const IMAGE_SCALE_MODES: { value: ImageScaleMode; label: string }[] = [
  { value: 'FILL', label: 'Fill' },
  { value: 'FIT', label: 'Fit' },
  { value: 'CROP', label: 'Crop' },
  { value: 'TILE', label: 'Tile' }
]

const inputCls = 'bg-input/50 rounded px-2 py-1 border border-border text-surface outline-none'

function isGradientType(type: FillType): boolean {
  return (
    type === 'GRADIENT_LINEAR' ||
    type === 'GRADIENT_RADIAL' ||
    type === 'GRADIENT_ANGULAR' ||
    type === 'GRADIENT_DIAMOND'
  )
}

/** Convert a plain fill into a gradient fill, seeding two stops from its color. */
function toGradient(fill: Fill, type: FillType): Fill {
  const stops =
    fill.gradientStops && fill.gradientStops.length >= 2
      ? fill.gradientStops
      : [
          { color: { ...fill.color, a: 1 }, position: 0 },
          { color: { ...fill.color, a: 0 }, position: 1 }
        ]
  return { ...fill, type, gradientStops: stops }
}

export interface FillRowProps {
  fill: Fill
  onChange: (fill: Fill) => void
  onRemove: () => void
}

/**
 * Editor for a single fill entry. Supports solid colors, the four gradient
 * subtypes (add/remove/move stops, edit each stop's color and position), and
 * image fills (scale mode + image reference).
 */
export function FillRow({ fill, onChange, onRemove }: FillRowProps) {
  const gradient = useGradientStops(fill, onChange)

  const changeType = (nextType: FillType) => {
    if (nextType === fill.type) return
    if (isGradientType(nextType)) {
      onChange(toGradient(fill, nextType))
    } else if (nextType === 'IMAGE') {
      onChange({ ...fill, type: 'IMAGE', imageScaleMode: fill.imageScaleMode ?? 'FILL' })
    } else {
      onChange({ ...fill, type: nextType })
    }
  }

  const setStopColor = (index: number, color: Color) => {
    onChange({
      ...fill,
      gradientStops: gradient.stops.map((s, i) => (i === index ? { ...s, color } : s))
    })
  }

  return (
    <div className="space-y-1.5 rounded border border-border bg-input/30 p-1.5 text-xs">
      <div className="flex items-center gap-2">
        <select
          className={inputCls + ' flex-1'}
          value={fill.type}
          onChange={(e) => changeType(e.target.value as FillType)}
        >
          {FILL_TYPE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <Tip label="Remove fill">
          <button
            type="button"
            className="text-muted hover:text-surface px-1"
            onClick={onRemove}
          >
            −
          </button>
        </Tip>
      </div>

      {fill.type === 'SOLID' && (
        <div className="flex items-center gap-2 px-0.5">
          <ColorSwatchPopover color={fill.color} onChange={(c) => onChange({ ...fill, color: c })} />
        </div>
      )}

      {isGradientType(fill.type) && (
        <div className="space-y-1.5">
          <div
            className="h-4 w-full rounded border border-border"
            style={{ background: gradient.barBackground }}
          />
          <div className="space-y-1">
            {gradient.stops.map((stop, i) => (
              <div key={i} className="flex items-center gap-2">
                <ColorSwatchPopover color={stop.color} onChange={(c) => setStopColor(i, c)} />
                <label className="flex w-16 items-center gap-1 bg-input/50 rounded px-1.5 py-1 border border-border">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    className="w-full bg-transparent outline-none text-surface"
                    value={Math.round(stop.position * 100)}
                    onChange={(e) => gradient.updateStopPosition(i, Number(e.target.value))}
                  />
                  <span className="text-muted text-[10px]">%</span>
                </label>
                <Tip label="Remove stop">
                  <button
                    type="button"
                    className="text-muted hover:text-surface disabled:opacity-30 px-1"
                    disabled={gradient.stops.length <= 2}
                    onClick={() => gradient.removeStop(i)}
                  >
                    −
                  </button>
                </Tip>
              </div>
            ))}
          </div>
          <button
            type="button"
            className="w-full rounded bg-input/50 py-1 text-[11px] text-muted hover:text-surface"
            onClick={() => gradient.addStop()}
          >
            + Add stop
          </button>
        </div>
      )}

      {fill.type === 'IMAGE' && (
        <div className="space-y-1.5">
          <label className="flex items-center gap-2 bg-input/50 rounded px-2 py-1 border border-border">
            <span className="text-muted text-[10px]">Scale</span>
            <select
              className="w-full bg-transparent outline-none text-surface"
              value={fill.imageScaleMode ?? 'FILL'}
              onChange={(e) =>
                onChange({ ...fill, imageScaleMode: e.target.value as ImageScaleMode })
              }
            >
              {IMAGE_SCALE_MODES.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 bg-input/50 rounded px-2 py-1 border border-border">
            <span className="text-muted text-[10px]">Hash</span>
            <input
              type="text"
              placeholder="image hash"
              className="w-full bg-transparent outline-none text-surface"
              value={fill.imageHash ?? ''}
              onChange={(e) => onChange({ ...fill, imageHash: e.target.value || undefined })}
            />
          </label>
          {fill.imageHash ? (
            <div
              className="h-16 w-full rounded border border-border bg-cover bg-center"
              style={{ backgroundColor: colorToCSS(fill.color) }}
            />
          ) : (
            <div className="rounded border border-dashed border-border p-2 text-center text-[10px] text-muted">
              No image
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default FillRow
