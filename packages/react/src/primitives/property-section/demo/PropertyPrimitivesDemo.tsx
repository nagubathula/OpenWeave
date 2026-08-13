import React, { useState } from 'react'

import type { Fill } from '@openweave/scene-graph'

import { PropertyListAdd } from '#react/primitives/property-list/PropertyListAdd'
import { PropertyListItem } from '#react/primitives/property-list/PropertyListItem'
import { PropertyListRemove } from '#react/primitives/property-list/PropertyListRemove'
import { PropertyListRoot } from '#react/primitives/property-list/PropertyListRoot'
import { PropertyListVisibility } from '#react/primitives/property-list/PropertyListVisibility'
import { PropertySectionActions } from '#react/primitives/property-section/PropertySectionActions'
import { PropertySectionContent } from '#react/primitives/property-section/PropertySectionContent'
import { PropertySectionEmptyAction } from '#react/primitives/property-section/PropertySectionEmptyAction'
import { PropertySectionHeader } from '#react/primitives/property-section/PropertySectionHeader'
import { PropertySectionRoot } from '#react/primitives/property-section/PropertySectionRoot'
import { PropertySectionTitle } from '#react/primitives/property-section/PropertySectionTitle'
import { SegmentedControlItem } from '#react/primitives/segmented-control/SegmentedControlItem'
import { SegmentedControlRoot } from '#react/primitives/segmented-control/SegmentedControlRoot'

const defaultFill: Fill = {
  type: 'SOLID',
  color: { r: 0.4, g: 0.5, b: 1, a: 1 },
  opacity: 1,
  visible: true,
  blendMode: 'NORMAL'
}

export function PropertyPrimitivesDemo() {
  const [alignment, setAlignment] = useState<string | string[] | undefined>('left')
  const [empty, setEmpty] = useState(true)
  const [lastAction, setLastAction] = useState('None')
  const [fills, setFills] = useState<Fill[]>(() => [
    structuredClone(defaultFill),
    { ...structuredClone(defaultFill), visible: false }
  ])

  const addFill = (fill: Fill) => setFills((current) => [...current, structuredClone(fill)])
  const removeFill = (index: number) =>
    setFills((current) => current.filter((_, i) => i !== index))
  const toggleFill = (index: number) =>
    setFills((current) =>
      current.map((fill, i) => (i === index ? { ...fill, visible: !fill.visible } : fill))
    )

  return (
    <div className="grid w-full max-w-[620px] gap-4 rounded-lg border border-[var(--vp-c-divider)] bg-[var(--vp-c-bg-soft)] p-5 text-xs text-[var(--vp-c-text-1)] sm:grid-cols-2">
      <div className="space-y-3">
        <PropertySectionRoot
          className="rounded border border-[var(--vp-c-divider)]"
          aria-label="Layer section"
        >
          <PropertySectionHeader className="flex items-center justify-between px-3 py-2">
            <PropertySectionTitle className="font-semibold">Layer</PropertySectionTitle>
            <PropertySectionActions className="text-[var(--vp-c-text-2)]">⌘ L</PropertySectionActions>
          </PropertySectionHeader>
          <PropertySectionContent className="border-t border-[var(--vp-c-divider)] px-3 py-2">
            Collapsible content
          </PropertySectionContent>
        </PropertySectionRoot>

        <PropertySectionRoot
          empty={empty}
          className="rounded border border-[var(--vp-c-divider)] px-3 py-2"
        >
          <PropertySectionHeader>
            <PropertySectionTitle className="font-semibold">Effects</PropertySectionTitle>
          </PropertySectionHeader>
          <PropertySectionContent>
            <PropertySectionEmptyAction
              className="mt-2 rounded bg-[var(--vp-c-bg-alt)] px-2 py-1"
              onClick={() => setEmpty(false)}
            >
              Add first effect
            </PropertySectionEmptyAction>
            {!empty && <p className="mt-2 text-[var(--vp-c-text-2)]">Drop shadow</p>}
          </PropertySectionContent>
        </PropertySectionRoot>
      </div>

      <div className="space-y-3">
        <SegmentedControlRoot
          modelValue={alignment}
          onModelValueChange={setAlignment}
          aria-label="Alignment"
          className="grid grid-cols-3 rounded bg-[var(--vp-c-bg-alt)] p-0.5"
        >
          {['left', 'center', 'right'].map((value) => (
            <SegmentedControlItem
              key={value}
              value={value}
              className="rounded px-2 py-1 capitalize data-[state=on]:bg-[var(--vp-c-bg-soft)]"
            >
              {value}
            </SegmentedControlItem>
          ))}
        </SegmentedControlRoot>

        <SegmentedControlRoot
          mode="action"
          aria-label="Transform actions"
          className="grid grid-cols-3 rounded bg-[var(--vp-c-bg-alt)] p-0.5"
          onAction={setLastAction}
        >
          {['flip-x', 'flip-y', 'rotate-90'].map((value) => (
            <SegmentedControlItem key={value} value={value} className="rounded px-2 py-1">
              {value}
            </SegmentedControlItem>
          ))}
        </SegmentedControlRoot>
        <p aria-live="polite" className="text-[var(--vp-c-text-2)]">
          Action: {lastAction}
        </p>
      </div>

      <PropertyListRoot
        propKey="fills"
        items={fills}
        onAdd={addFill}
        onRemove={removeFill}
        onToggleVisibility={toggleFill}
      >
        {({ items }) => (
          <div className="space-y-1 rounded border border-[var(--vp-c-divider)] p-2 sm:col-span-2">
            {items.map((_, index) => (
              <PropertyListItem
                key={index}
                propKey="fills"
                index={index}
                className="flex items-center gap-2 rounded bg-[var(--vp-c-bg-alt)] px-2 py-1 data-[hidden]:opacity-50"
              >
                {({ hidden }) => (
                  <>
                    <span className="min-w-0 flex-1 truncate">Fill {index + 1}</span>
                    <PropertyListVisibility propKey="fills" index={index}>
                      {hidden ? 'Show' : 'Hide'}
                    </PropertyListVisibility>
                    <PropertyListRemove propKey="fills" index={index}>
                      Remove
                    </PropertyListRemove>
                  </>
                )}
              </PropertyListItem>
            ))}
            <PropertyListAdd
              propKey="fills"
              item={defaultFill}
              className="rounded bg-[var(--vp-c-bg-alt)] px-2 py-1"
            >
              Add fill
            </PropertyListAdd>
          </div>
        )}
      </PropertyListRoot>
    </div>
  )
}

export default PropertyPrimitivesDemo
