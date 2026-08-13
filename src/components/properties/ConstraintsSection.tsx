import React from 'react'
import { useConstraints } from '@openweave/react'
import type { ConstraintType } from '@openweave/scene-graph'

const HORIZONTAL_OPTIONS: { value: ConstraintType; label: string }[] = [
  { value: 'MIN', label: 'Left' },
  { value: 'CENTER', label: 'Center' },
  { value: 'MAX', label: 'Right' },
  { value: 'STRETCH', label: 'Left & Right' },
  { value: 'SCALE', label: 'Scale' }
]

const VERTICAL_OPTIONS: { value: ConstraintType; label: string }[] = [
  { value: 'MIN', label: 'Top' },
  { value: 'CENTER', label: 'Center' },
  { value: 'MAX', label: 'Bottom' },
  { value: 'STRETCH', label: 'Top & Bottom' },
  { value: 'SCALE', label: 'Scale' }
]

const selectClass =
  'w-full bg-input/50 rounded px-2 py-1 border border-border text-surface outline-none'

function isConstraintType(value: string): value is ConstraintType {
  return value === 'MIN' || value === 'CENTER' || value === 'MAX' || value === 'STRETCH' || value === 'SCALE'
}

export function ConstraintsSection() {
  const { active, horizontal, vertical, setAxis } = useConstraints()

  if (!active) return null

  const horizontalValue = typeof horizontal === 'string' ? horizontal : ''
  const verticalValue = typeof vertical === 'string' ? vertical : ''

  return (
    <section aria-label="Constraints" className="space-y-2 border-b border-border pb-3">
      <div className="text-[11px] font-semibold text-muted uppercase tracking-wider">Constraints</div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <label className="flex flex-col gap-1">
          <span className="text-muted text-[10px]">Horizontal</span>
          <select
            className={selectClass}
            value={horizontalValue}
            onChange={(e) => { if (isConstraintType(e.target.value)) setAxis('horizontal', e.target.value) }}
          >
            {horizontalValue === '' && <option value="">Mixed</option>}
            {HORIZONTAL_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-muted text-[10px]">Vertical</span>
          <select
            className={selectClass}
            value={verticalValue}
            onChange={(e) => { if (isConstraintType(e.target.value)) setAxis('vertical', e.target.value) }}
          >
            {verticalValue === '' && <option value="">Mixed</option>}
            {VERTICAL_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </label>
      </div>
    </section>
  )
}

export default ConstraintsSection
