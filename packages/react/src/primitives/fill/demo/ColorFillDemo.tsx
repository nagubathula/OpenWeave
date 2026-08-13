import React, { useMemo, useState } from 'react'

import type { Fill, Variable } from '@openweave/scene-graph'
import type { Color } from '@openweave/scene-graph/primitives'

import type { BindingProvider, BindingTarget } from '#react/controls/binding-provider/types'
import { BindableValueRoot } from '#react/primitives/bindable-value/BindableValueRoot'
import { ChannelSliderRoot } from '#react/primitives/channel-slider/ChannelSliderRoot'
import { ChannelSliderThumb } from '#react/primitives/channel-slider/ChannelSliderThumb'
import { ChannelSliderTrack } from '#react/primitives/channel-slider/ChannelSliderTrack'
import { FillRoot } from '#react/primitives/fill/FillRoot'
import { FillSwatch } from '#react/primitives/fill/FillSwatch'

const solid: Fill = {
  type: 'SOLID',
  color: { r: 0.22, g: 0.48, b: 0.96, a: 1 },
  opacity: 1,
  visible: true
}

const transparent: Fill = {
  ...solid,
  color: { ...solid.color, a: 0.45 }
}

const gradient: Fill = {
  ...solid,
  type: 'GRADIENT_LINEAR',
  gradientStops: [
    { color: { r: 0.55, g: 0.24, b: 0.98, a: 1 }, position: 0 },
    { color: { r: 0.08, g: 0.72, b: 0.65, a: 0.65 }, position: 1 }
  ]
}

const target: BindingTarget[] = [{ nodeId: 'demo', path: 'fills/0/color' }]

const variable: Variable = {
  id: 'color/brand',
  name: 'Color/Brand',
  type: 'COLOR',
  collectionId: 'demo',
  valuesByMode: { default: { r: 0.65, g: 0.3, b: 0.95, a: 1 } },
  description: '',
  hiddenFromPublishing: false
}

const boundColor: Color = { r: 0.65, g: 0.3, b: 0.95, a: 1 }

const provider: BindingProvider<Color> = {
  listVariables: () => [variable],
  filterVariables: () => [variable],
  getBound: () => variable,
  getState: () => 'bound',
  resolve: (variableId) => (variableId === variable.id ? boundColor : undefined),
  bind: () => undefined,
  unbind: () => undefined
}

const swatchClass =
  'relative size-10 overflow-hidden rounded-md border border-[var(--vp-c-divider)] bg-[conic-gradient(#ddd_25%,#fff_0_50%,#ddd_0_75%,#fff_0)] bg-[size:10px_10px]'

export function ColorFillDemo() {
  const [editableFill, setEditableFill] = useState<Fill>(() => structuredClone(solid))
  const [chroma, setChroma] = useState(0.16)

  const swatches = useMemo(
    () => [
      { name: 'Solid', fill: solid },
      { name: 'Transparent', fill: transparent },
      { name: 'Gradient', fill: gradient }
    ],
    []
  )

  return (
    <div className="w-full max-w-[560px] space-y-5 rounded-lg border border-[var(--vp-c-divider)] bg-[var(--vp-c-bg-soft)] p-5 text-[var(--vp-c-text-1)]">
      <section>
        <h3 className="mb-2 text-sm font-semibold">Fill swatches</h3>
        <div className="flex flex-wrap gap-4">
          {swatches.map(({ name, fill }) => (
            <FillSwatch key={name} fill={fill} label={`${name} fill`} className={swatchClass}>
              {(swatch) => <span className="absolute inset-0" style={{ background: swatch.background }} />}
            </FillSwatch>
          ))}
          <BindableValueRoot provider={provider} targets={target} value={solid.color}>
            <FillSwatch
              fill={solid}
              label="Bound token fill"
              className="relative size-10 overflow-hidden rounded-md border border-[var(--vp-c-divider)]"
            >
              {(swatch) => <span className="absolute inset-0" style={{ background: swatch.background }} />}
            </FillSwatch>
          </BindableValueRoot>
        </div>
      </section>

      <section>
        <h3 className="mb-2 text-sm font-semibold">Fill state</h3>
        <FillRoot fill={editableFill} onUpdate={setEditableFill}>
          {(fillModel) => (
            <div className="flex items-center gap-2">
              <FillSwatch
                fill={editableFill}
                label="Editable fill"
                className="relative size-8 overflow-hidden rounded border border-[var(--vp-c-divider)]"
              >
                {(swatch) => (
                  <span className="absolute inset-0" style={{ background: swatch.background }} />
                )}
              </FillSwatch>
              <button className="rounded border px-2 py-1 text-xs" onClick={fillModel.actions.toSolid}>
                Solid
              </button>
              <button
                className="rounded border px-2 py-1 text-xs"
                onClick={fillModel.actions.toGradient}
              >
                Gradient
              </button>
              <button className="rounded border px-2 py-1 text-xs" onClick={fillModel.actions.toImage}>
                Image
              </button>
            </div>
          )}
        </FillRoot>
      </section>

      <section>
        <h3 className="mb-2 text-sm font-semibold">OkHCL channel</h3>
        <ChannelSliderRoot
          modelValue={chroma}
          onModelValueChange={setChroma}
          label="Chroma"
          min={0}
          max={0.4}
          step={0.001}
          formatValueText={(value) => `${Math.round(value * 100)}%`}
          className="relative flex h-4 touch-none items-center"
        >
          {(slider) => (
            <>
              <ChannelSliderTrack className="absolute h-3 w-full rounded bg-[linear-gradient(to_right,#ddd,#7c3aed)]" />
              <ChannelSliderThumb className="block size-4 rounded-full border-2 border-white bg-violet-600 shadow outline-none focus-visible:ring-2" />
              <output className="ml-auto pl-4 text-xs tabular-nums">
                {Math.round(slider.value * 100)}%
              </output>
            </>
          )}
        </ChannelSliderRoot>
      </section>
    </div>
  )
}

export default ColorFillDemo
