'use client'

import React from 'react'
import { useLayout } from '@openweave/react'
import type {
  LayoutAlign,
  LayoutCounterAlign,
  LayoutMode,
  LayoutSizing,
  SceneNode
} from '@openweave/scene-graph'

const CONTAINER_TYPES = new Set(['FRAME', 'COMPONENT', 'INSTANCE', 'SECTION'])

type SizeLimitProp = 'minWidth' | 'maxWidth' | 'minHeight' | 'maxHeight'

const SIZE_LIMITS: { prop: SizeLimitProp; label: string }[] = [
  { prop: 'minWidth', label: 'Min W' },
  { prop: 'maxWidth', label: 'Max W' },
  { prop: 'minHeight', label: 'Min H' },
  { prop: 'maxHeight', label: 'Max H' }
]

interface SizeLimitControls {
  addSizeLimit: (prop: SizeLimitProp) => void
  updateSizeLimit: (prop: SizeLimitProp, value: number) => void
  removeSizeLimit: (prop: SizeLimitProp) => void
}

function SizeLimitField({
  node,
  prop,
  label,
  controls
}: {
  node: SceneNode
  prop: SizeLimitProp
  label: string
  controls: SizeLimitControls
}) {
  const value = node[prop]
  if (value == null) {
    return (
      <button
        type="button"
        className="flex items-center justify-between rounded px-2 py-1 border border-dashed border-border text-[11px] text-muted hover:text-surface"
        onClick={() => controls.addSizeLimit(prop)}
      >
        <span>{label}</span>
        <span>+</span>
      </button>
    )
  }
  return (
    <div className="flex items-center gap-1.5 bg-input/50 rounded px-2 py-1 border border-border text-xs">
      <span className="text-muted text-[10px]">{label}</span>
      <input
        type="number"
        className="w-full bg-transparent outline-none text-surface"
        value={Math.round(value)}
        onChange={(e) => controls.updateSizeLimit(prop, Number(e.target.value))}
      />
      <button
        type="button"
        className="text-muted hover:text-surface"
        title={`Remove ${label}`}
        onClick={() => controls.removeSizeLimit(prop)}
      >
        −
      </button>
    </div>
  )
}

const inputCls =
  'flex items-center gap-1.5 bg-input/50 rounded px-2 py-1 border border-border text-xs'
const fieldCls = 'w-full bg-transparent outline-none text-surface'

/**
 * Auto Layout controls for container nodes — add/remove auto-layout, flow
 * direction, gap, padding, alignment, and axis sizing.
 */
export default function LayoutSection() {
  const layout = useLayout()
  const { editor, node, isFlex } = layout

  if (!node || !CONTAINER_TYPES.has(node.type)) return null

  const mode = node.layoutMode
  const hasAutoLayout = mode !== 'NONE'

  const setMode = (next: LayoutMode) =>
    editor.updateNodeWithUndo(
      node.id,
      { layoutMode: next },
      next === 'NONE' ? 'Remove auto layout' : 'Add auto layout'
    )

  const directions: { mode: LayoutMode; label: string }[] = [
    { mode: 'HORIZONTAL', label: 'Horizontal' },
    { mode: 'VERTICAL', label: 'Vertical' },
    { mode: 'GRID', label: 'Grid' }
  ]

  return (
    <div className="space-y-2 border-b border-border pb-3" data-test-id="layout-section">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold text-muted uppercase tracking-wider">
          Auto Layout
        </span>
        <button
          type="button"
          data-test-id="toggle-auto-layout"
          className="text-xs text-muted hover:text-surface"
          title={hasAutoLayout ? 'Remove auto layout' : 'Add auto layout'}
          onClick={() => setMode(hasAutoLayout ? 'NONE' : 'HORIZONTAL')}
        >
          {hasAutoLayout ? '−' : '+'}
        </button>
      </div>

      {hasAutoLayout && (
        <div className="space-y-2">
          <div className="flex gap-1">
            {directions.map((d) => (
              <button
                key={d.mode}
                type="button"
                onClick={() => setMode(d.mode)}
                className={
                  'flex-1 rounded px-2 py-1 text-[11px] transition-colors ' +
                  (mode === d.mode
                    ? 'bg-accent text-accent-foreground'
                    : 'bg-input/50 text-muted hover:text-surface')
                }
              >
                {d.label}
              </button>
            ))}
          </div>

          {isFlex && (
            <div className="grid grid-cols-2 gap-2">
              <label className={inputCls}>
                <span className="text-muted text-[10px]">Gap</span>
                <input
                  type="number"
                  className={fieldCls}
                  value={Math.round(node.itemSpacing ?? 0)}
                  onChange={(e) => layout.updateProp('itemSpacing', Number(e.target.value))}
                />
              </label>
              <label className={inputCls}>
                <span className="text-muted text-[10px]">Pad</span>
                <input
                  type="number"
                  className={fieldCls}
                  value={Math.round(node.paddingTop ?? 0)}
                  onChange={(e) => {
                    const v = Number(e.target.value)
                    layout.setHorizontalPadding(v)
                    layout.setVerticalPadding(v)
                  }}
                />
              </label>
            </div>
          )}

          {isFlex && (
            <div className="grid grid-cols-2 gap-2">
              <label className={inputCls}>
                <span className="text-muted text-[10px]">Align</span>
                <select
                  className={fieldCls}
                  value={node.primaryAxisAlign}
                  onChange={(e) =>
                    layout.setAlignment(e.target.value as LayoutAlign, node.counterAxisAlign)
                  }
                >
                  <option value="MIN">Start</option>
                  <option value="CENTER">Center</option>
                  <option value="MAX">End</option>
                  <option value="SPACE_BETWEEN">Space between</option>
                </select>
              </label>
              <label className={inputCls}>
                <span className="text-muted text-[10px]">Cross</span>
                <select
                  className={fieldCls}
                  value={node.counterAxisAlign}
                  onChange={(e) =>
                    layout.setAlignment(node.primaryAxisAlign, e.target.value as LayoutCounterAlign)
                  }
                >
                  <option value="MIN">Start</option>
                  <option value="CENTER">Center</option>
                  <option value="MAX">End</option>
                </select>
              </label>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <label className={inputCls}>
              <span className="text-muted text-[10px]">W</span>
              <select
                className={fieldCls}
                value={layout.widthSizing}
                onChange={(e) => layout.setAxisSizing('width', e.target.value as LayoutSizing)}
              >
                {layout.widthSizingOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <label className={inputCls}>
              <span className="text-muted text-[10px]">H</span>
              <select
                className={fieldCls}
                value={layout.heightSizing}
                onChange={(e) => layout.setAxisSizing('height', e.target.value as LayoutSizing)}
              >
                {layout.heightSizingOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      )}

      <div className="space-y-1.5 pt-1">
        <div className="text-[10px] font-semibold text-muted uppercase tracking-wider">
          Size Limits
        </div>
        <div className="grid grid-cols-2 gap-2">
          {SIZE_LIMITS.map((limit) => (
            <SizeLimitField
              key={limit.prop}
              node={node}
              prop={limit.prop}
              label={limit.label}
              controls={layout}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
