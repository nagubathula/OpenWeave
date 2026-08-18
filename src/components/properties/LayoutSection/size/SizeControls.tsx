import React from 'react'

import { useI18n, useLayoutControlsContext } from '@openweave/react'

import SizeAxisField from '@/components/properties/LayoutSection/size/SizeAxisField'
import SizeLimitField from '@/components/properties/LayoutSection/size/SizeLimitField'
import type { SizeLimitItem } from '@/components/properties/LayoutSection/size/types'
import PanelGrid from '@/components/ui/panel/PanelGrid'

/**
 * W/H fields plus any active size limits (min/max W/H). Rendered for every
 * selected node, not just containers — matches the old Vue SizeControls,
 * which applied to leaf shapes too.
 */
export default function SizeControls() {
  const ctx = useLayoutControlsContext()
  const { panels } = useI18n()
  const { node } = ctx

  const sizeLimits: SizeLimitItem[] = [
    {
      prop: 'minWidth',
      icon: panels.minWidthShort,
      label: panels.minWidthShort,
      setLabel: panels.setToCurrentWidth,
      removeLabel: panels.removeMinWidth
    },
    {
      prop: 'maxWidth',
      icon: panels.maxWidthShort,
      label: panels.maxWidthShort,
      setLabel: panels.setToCurrentWidth,
      removeLabel: panels.removeMaxWidth
    },
    {
      prop: 'minHeight',
      icon: panels.minHeightShort,
      label: panels.minHeightShort,
      setLabel: panels.setToCurrentHeight,
      removeLabel: panels.removeMinHeight
    },
    {
      prop: 'maxHeight',
      icon: panels.maxHeightShort,
      label: panels.maxHeightShort,
      setLabel: panels.setToCurrentHeight,
      removeLabel: panels.removeMaxHeight
    }
  ]

  const visibleSizeLimits = sizeLimits.filter((item) => node[item.prop] != null)

  return (
    <>
      <PanelGrid columns={2}>
        <SizeAxisField axis="width" icon="W" label={panels.width} />
        <SizeAxisField axis="height" icon="H" label={panels.height} />
      </PanelGrid>

      {visibleSizeLimits.length > 0 && (
        <PanelGrid columns={2} className="mt-1.5">
          {visibleSizeLimits.map((item) => (
            <SizeLimitField key={item.prop} item={item} />
          ))}
        </PanelGrid>
      )}
    </>
  )
}
