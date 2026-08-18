import React from 'react'

import { useLayoutControlsContext } from '@openweave/react'

import FieldSelectMenu from '@/components/properties/LayoutSection/FieldSelectMenu'
import type { SizeLimitFieldProps } from '@/components/properties/LayoutSection/size/types'
import VariableNumberField from '@/components/properties/LayoutSection/VariableNumberField'
import Tip from '@/components/ui/Tip'

/** A single size-limit field (min/max W/H): value plus "set to current" / "remove" menu. */
export default function SizeLimitField({ item }: SizeLimitFieldProps) {
  const ctx = useLayoutControlsContext()
  const { node } = ctx

  function handleSelect(value: string) {
    if (value === 'CURRENT') ctx.setSizeLimitToCurrent(item.prop)
    else if (value === 'REMOVE') ctx.removeSizeLimit(item.prop)
  }

  return (
    <Tip label={item.label}>
      <VariableNumberField
        icon={item.icon}
        ariaLabel={item.label}
        value={Math.round(node[item.prop] ?? 0)}
        min={0}
        nodeId={node.id}
        bindingPath={item.prop}
        onChange={(v) => ctx.updateSizeLimit(item.prop, v)}
        onCommit={(v, p) => ctx.commitSizeLimit(item.prop, v, p)}
        trailing={
          <FieldSelectMenu
            ariaLabel={item.label}
            value="VALUE"
            onValueChange={handleSelect}
            options={[
              { value: 'CURRENT', label: item.setLabel },
              { value: 'REMOVE', label: item.removeLabel }
            ]}
          />
        }
      />
    </Tip>
  )
}
