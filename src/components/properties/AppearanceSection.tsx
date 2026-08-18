import { Eye, EyeOff, SquareRoundCorner, Squircle, Blend } from 'lucide-react'
import React from 'react'

import { useAppearance, MIXED, useI18n } from '@openweave/react'
import type { BlendMode } from '@openweave/scene-graph'

import NumberField from '@/components/inputs/NumberField'
import { useBlendModeOptions } from '@/components/properties/blend-mode/use'
import VariableNumberField from '@/components/properties/LayoutSection/VariableNumberField'

const labelClass = 'text-[10px] text-muted'
const iconButtonClass =
  'flex size-6 shrink-0 cursor-pointer items-center justify-center rounded text-muted transition-colors hover:bg-hover hover:text-surface data-[active=true]:bg-hover data-[active=true]:text-surface'

export function AppearanceSection() {
  const { panels } = useI18n()
  const {
    node,
    active,
    isMulti,
    hasCornerRadius,
    independentCorners,
    showIndependentCorners,
    cornerRadiusValue,
    cornerSmoothingPercent,
    opacityPercent,
    blendModeValue,
    visibilityState,
    updateProp,
    commitProp,
    setBlendMode,
    toggleVisibility,
    toggleIndependentCorners,
    updateCornerProp,
    commitCornerProp
  } = useAppearance()

  const blendOptions = useBlendModeOptions(true)

  if (!active) return null

  const corners =
    !isMulti && node
      ? ([
          ['TL', 'topLeftRadius', node.topLeftRadius],
          ['TR', 'topRightRadius', node.topRightRadius],
          ['BL', 'bottomLeftRadius', node.bottomLeftRadius],
          ['BR', 'bottomRightRadius', node.bottomRightRadius]
        ] as const)
      : []

  return (
    <section
      aria-label={panels.appearance}
      className="space-y-1.5 border-b border-border pb-3"
      data-test-id="appearance-section"
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold text-muted uppercase tracking-wider">
          {panels.appearance}
        </span>
        <button
          type="button"
          aria-label={panels.toggleVisibility}
          data-active={visibilityState === 'hidden'}
          className={iconButtonClass}
          onClick={toggleVisibility}
        >
          {visibilityState === 'visible' ? (
            <Eye className="size-3.5" />
          ) : visibilityState === 'hidden' ? (
            <EyeOff className="size-3.5" />
          ) : (
            <Eye className="size-3.5 opacity-50" />
          )}
        </button>
      </div>

      <div className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] gap-1.5">
        <label className="flex min-w-0 flex-col gap-1">
          <span className={labelClass}>{panels.blendMode}</span>
          <select
            aria-label={panels.blendMode}
            className="h-6 w-full min-w-0 rounded border border-border bg-input/50 px-1.5 text-[11px] text-surface outline-none focus:border-accent"
            value={typeof blendModeValue === 'string' ? blendModeValue : 'MIXED'}
            onChange={(e) => {
              if (e.target.value !== 'MIXED') setBlendMode(e.target.value as BlendMode)
            }}
          >
            {blendModeValue === MIXED && <option value="MIXED">{panels.mixed}</option>}
            {blendOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex min-w-0 flex-col gap-1">
          <span className={labelClass}>{panels.opacity}</span>
          {typeof opacityPercent === 'number' && !isMulti && node ? (
            <VariableNumberField
              ariaLabel={panels.opacity}
              nodeId={node.id}
              bindingPath="opacity"
              value={opacityPercent}
              min={0}
              max={100}
              suffix="%"
              icon={<Blend className="size-3 shrink-0 text-muted" />}
              onChange={(v) => updateProp('opacity', v / 100)}
              onCommit={(v) => commitProp('opacity', v / 100, v / 100)}
            />
          ) : (
            <NumberField
              ariaLabel={panels.opacity}
              value={opacityPercent}
              min={0}
              max={100}
              suffix="%"
              icon={<Blend className="size-3 shrink-0 text-muted" />}
              onChange={(v) => updateProp('opacity', v / 100)}
              onCommit={(v) => commitProp('opacity', v / 100, v / 100)}
            />
          )}
        </label>
      </div>

      {hasCornerRadius && !showIndependentCorners && (
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-1.5">
          <label className="flex min-w-0 flex-col gap-1">
            <span className={labelClass}>{panels.radius}</span>
            {typeof cornerRadiusValue === 'number' && !isMulti && node ? (
              <VariableNumberField
                ariaLabel={panels.radius}
                nodeId={node.id}
                bindingPath="cornerRadius"
                value={cornerRadiusValue}
                min={0}
                icon={<SquareRoundCorner className="size-3 shrink-0 text-muted" />}
                onChange={(v) => updateProp('cornerRadius', v)}
                onCommit={(v) => commitProp('cornerRadius', v, v)}
              />
            ) : (
              <NumberField
                ariaLabel={panels.radius}
                value={cornerRadiusValue}
                min={0}
                icon={<SquareRoundCorner className="size-3 shrink-0 text-muted" />}
                onChange={(v) => updateProp('cornerRadius', v)}
                onCommit={(v) => commitProp('cornerRadius', v, v)}
              />
            )}
          </label>
          <button
            type="button"
            aria-label={panels.independentCornerRadii}
            data-active={independentCorners === true}
            className={iconButtonClass}
            onClick={toggleIndependentCorners}
          >
            <SquareRoundCorner className="size-3" />
          </button>
        </div>
      )}

      {hasCornerRadius && showIndependentCorners && !isMulti && node && (
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] gap-1.5" data-corner-grid>
          <div className="col-span-2 grid grid-cols-2 gap-1.5">
            {corners.map(([label, key, value]) => (
              <label key={key} className="flex min-w-0 flex-col gap-1">
                <span className={labelClass}>{label}</span>
                {typeof value === 'number' ? (
                  <VariableNumberField
                    ariaLabel={`${panels.radius} ${label}`}
                    nodeId={node.id}
                    bindingPath={key as any}
                    value={value}
                    min={0}
                    onChange={(v) => updateCornerProp(key, v)}
                    onCommit={(v) => commitCornerProp(key, v, v)}
                  />
                ) : (
                  <NumberField
                    ariaLabel={`${panels.radius} ${label}`}
                    value={value}
                    min={0}
                    onChange={(v) => updateCornerProp(key, v)}
                    onCommit={(v) => commitCornerProp(key, v, v)}
                  />
                )}
              </label>
            ))}
          </div>
          <button
            type="button"
            aria-label={panels.independentCornerRadii}
            data-active
            className={`${iconButtonClass} self-start`}
            onClick={toggleIndependentCorners}
          >
            <SquareRoundCorner className="size-3" />
          </button>
        </div>
      )}

      {hasCornerRadius && (
        <label className="flex w-1/2 min-w-0 flex-col gap-1 pr-1">
          <span className={labelClass}>{panels.cornerSmoothing}</span>
          <NumberField
            ariaLabel={panels.cornerSmoothing}
            dataProperty="corner-smoothing"
            value={cornerSmoothingPercent}
            min={0}
            max={100}
            suffix="%"
            icon={<Squircle className="size-3 shrink-0 text-muted" />}
            onChange={(v) => updateCornerProp('cornerSmoothing', v / 100)}
            onCommit={(v) => commitCornerProp('cornerSmoothing', v / 100, v / 100)}
          />
        </label>
      )}
    </section>
  )
}

export default AppearanceSection
