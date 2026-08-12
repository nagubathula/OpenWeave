import React from 'react'
import { useTypography } from '@openweave/react'
import type { SceneNode } from '@openweave/scene-graph'
import FontPicker from '@/components/font-picker/FontPicker'

type TextAlign = SceneNode['textAlignHorizontal']

const ALIGN_OPTIONS: { value: TextAlign; label: string }[] = [
  { value: 'LEFT', label: 'Left' },
  { value: 'CENTER', label: 'Center' },
  { value: 'RIGHT', label: 'Right' },
  { value: 'JUSTIFIED', label: 'Justify' }
]

const inputClass =
  'w-full bg-input/50 rounded px-2 py-1 border border-border text-surface outline-none'

function isTextAlign(value: string): value is TextAlign {
  return value === 'LEFT' || value === 'CENTER' || value === 'RIGHT' || value === 'JUSTIFIED'
}

export function TypographySection() {
  const {
    node,
    fontFamily,
    fontWeight,
    fontSize,
    weights,
    setFamily,
    setWeight,
    setAlign,
    updateProp,
    commitProp
  } = useTypography()

  if (!node) return null

  const lineHeight = node.lineHeight ?? ''
  const letterSpacing = node.letterSpacing ?? 0

  const commitNumber = (key: keyof SceneNode, value: number | null) => {
    updateProp(key, value)
    commitProp(key, value, value)
  }

  return (
    <div className="space-y-2 border-b border-border pb-3">
      <div className="text-[11px] font-semibold text-muted uppercase tracking-wider">Typography</div>

      <label className="flex flex-col gap-1 text-xs">
        <span className="text-muted text-[10px]">Font</span>
        <FontPicker value={fontFamily} onSelect={(family) => { void setFamily(family) }} />
      </label>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <label className="flex flex-col gap-1">
          <span className="text-muted text-[10px]">Weight</span>
          <select
            className={inputClass}
            value={fontWeight}
            onChange={(e) => { void setWeight(Number(e.target.value)) }}
          >
            {weights.map((w) => (
              <option key={w.value} value={w.value}>{w.label}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-muted text-[10px]">Size</span>
          <input
            type="number"
            min={1}
            className={inputClass}
            value={fontSize}
            onChange={(e) => commitNumber('fontSize', Number(e.target.value))}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-muted text-[10px]">Line height</span>
          <input
            type="number"
            className={inputClass}
            value={typeof lineHeight === 'number' ? lineHeight : ''}
            placeholder="Auto"
            onChange={(e) => {
              const v = e.target.value
              commitNumber('lineHeight', v === '' ? null : Number(v))
            }}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-muted text-[10px]">Letter spacing</span>
          <input
            type="number"
            className={inputClass}
            value={letterSpacing}
            onChange={(e) => commitNumber('letterSpacing', Number(e.target.value))}
          />
        </label>
      </div>

      <label className="flex flex-col gap-1 text-xs">
        <span className="text-muted text-[10px]">Alignment</span>
        <select
          className={inputClass}
          value={node.textAlignHorizontal}
          onChange={(e) => { if (isTextAlign(e.target.value)) setAlign(e.target.value) }}
        >
          {ALIGN_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </label>
    </div>
  )
}

export default TypographySection
