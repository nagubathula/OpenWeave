import React from 'react'

import { useI18n, useLayoutControlsContext } from '@openweave/react'
import type { SizeLimitProp } from '@openweave/react'
import type { LayoutSizing } from '@openweave/scene-graph'

import FieldSelectMenu from '@/components/properties/LayoutSection/FieldSelectMenu'
import type { SizeAxisFieldProps } from '@/components/properties/LayoutSection/size/types'
import VariableNumberField from '@/components/properties/LayoutSection/VariableNumberField'
import Tip from '@/components/ui/Tip'

type SizeSelectValue = LayoutSizing | `add-${SizeLimitProp}` | `remove-${SizeLimitProp}`

/** A single W/H axis field: numeric value plus a sizing (Fixed/Hug/Fill) and size-limit menu. */
export default function SizeAxisField({ axis, icon, label }: SizeAxisFieldProps) {
  const ctx = useLayoutControlsContext()
  const { panels } = useI18n()
  const { node } = ctx

  const sizing = axis === 'width' ? ctx.widthSizing : ctx.heightSizing
  const sizingOptions = axis === 'width' ? ctx.widthSizingOptions : ctx.heightSizingOptions
  const sizingLabel =
    sizing === 'HUG' ? panels.sizingHugShort : sizing === 'FILL' ? panels.sizingFillShort : ''

  const limitItems =
    axis === 'width'
      ? [
          {
            prop: 'minWidth' as const,
            addLabel: panels.addMinWidth,
            removeLabel: panels.removeMinWidth
          },
          {
            prop: 'maxWidth' as const,
            addLabel: panels.addMaxWidth,
            removeLabel: panels.removeMaxWidth
          }
        ]
      : [
          {
            prop: 'minHeight' as const,
            addLabel: panels.addMinHeight,
            removeLabel: panels.removeMinHeight
          },
          {
            prop: 'maxHeight' as const,
            addLabel: panels.addMaxHeight,
            removeLabel: panels.removeMaxHeight
          }
        ]

  function handleSelect(value: SizeSelectValue) {
    if (value === 'FIXED' || value === 'HUG' || value === 'FILL') {
      ctx.setAxisSizing(axis, value)
      return
    }
    const [action, prop] = value.split('-') as ['add' | 'remove', SizeLimitProp]
    if (action === 'add') ctx.addSizeLimit(prop)
    else ctx.removeSizeLimit(prop)
  }

  const selectOptions = [
    ...sizingOptions.map((option) => ({ value: option.value, label: option.label })),
    ...limitItems.map((item) => ({
      value: `${node[item.prop] == null ? 'add' : 'remove'}-${item.prop}`,
      label: node[item.prop] == null ? item.addLabel : item.removeLabel
    }))
  ]

  if (sizing === 'HUG' || sizing === 'FILL') {
    return (
      <Tip label={label}>
        <div
          data-property={axis}
          className="flex h-6 min-w-0 flex-1 items-center justify-between rounded border border-transparent bg-panel-field px-1.5 text-[11px] text-surface hover:bg-panel-field-hover"
        >
          <div className="flex min-w-0 items-center gap-1.5">
            <span className="flex shrink-0 items-center text-[11px] text-muted">{icon}</span>
            <span className="truncate">{sizingLabel}</span>
          </div>
          <FieldSelectMenu
            ariaLabel={label}
            value={sizing}
            seamless
            onValueChange={(value) => handleSelect(value as SizeSelectValue)}
            options={selectOptions}
          />
        </div>
      </Tip>
    )
  }

  return (
    <Tip label={label}>
      <VariableNumberField
        icon={icon}
        ariaLabel={label}
        value={Math.round(node[axis])}
        min={0}
        nodeId={node.id}
        bindingPath={axis}
        onChange={(v) => ctx.updateAxisSize(axis, v)}
        onCommit={(v, p) => ctx.commitAxisSize(axis, v, p)}
        trailing={
          <FieldSelectMenu
            ariaLabel={label}
            value="FIXED"
            seamless
            onValueChange={(value) => handleSelect(value as SizeSelectValue)}
            options={selectOptions}
          />
        }
      />
    </Tip>
  )
}
