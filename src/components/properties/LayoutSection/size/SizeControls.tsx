/* eslint-disable openweave/no-hardcoded-tip-labels */
import { createLucideIcon } from 'lucide-react'
import React, { useState } from 'react'

import { useI18n, useLayoutControlsContext } from '@openweave/react'

import SizeAxisField from '@/components/properties/LayoutSection/size/SizeAxisField'
import SizeLimitField from '@/components/properties/LayoutSection/size/SizeLimitField'
import type { SizeLimitItem } from '@/components/properties/LayoutSection/size/types'
import IconButton from '@/components/ui/IconButton'
import PanelGrid from '@/components/ui/panel/PanelGrid'
import Tip from '@/components/ui/Tip'

const ExpandLimitsIcon = createLucideIcon('ExpandLimitsIcon', [
  ['path', { d: 'M4 2H2v2M10 2h2v2M12 10v2h-2M4 12H2v-2', key: 'p1' }],
  ['rect', { x: '4.5', y: '4.5', width: '5', height: '5', rx: '0.5', key: 'r1' }]
])

/**
 * W/H fields plus any active size limits (min/max W/H) under "Resizing".
 * Rendered for every selected node, matching Figma UI3.
 */
export default function SizeControls() {
  const ctx = useLayoutControlsContext()
  const { panels } = useI18n()
  const { node } = ctx
  const [expandedLimits, setExpandedLimits] = useState(false)

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

  const activeSizeLimits = sizeLimits.filter((item) => node[item.prop] != null)
  const showLimits = expandedLimits || activeSizeLimits.length > 0

  return (
    <div className="mt-2">
      <label className="mb-1 block text-[11px] text-muted">Resizing</label>
      <div className="flex items-center gap-1.5">
        <div className="grid min-w-0 flex-1 grid-cols-2 gap-1.5">
          <SizeAxisField axis="width" icon="W" label={panels.width} />
          <SizeAxisField axis="height" icon="H" label={panels.height} />
        </div>
        <Tip label="Size limits">
          <IconButton
            label="Size limits"
            size="md"
            active={showLimits}
            onClick={() => {
              if (activeSizeLimits.length === 0 && !expandedLimits) {
                ctx.addSizeLimit('minWidth')
              }
              setExpandedLimits(!expandedLimits)
            }}
          >
            <ExpandLimitsIcon />
          </IconButton>
        </Tip>
      </div>

      {showLimits && (
        <PanelGrid columns={2} className="mt-1.5">
          {(expandedLimits && activeSizeLimits.length === 0
            ? sizeLimits.slice(0, 2)
            : activeSizeLimits
          ).map((item) => (
            <SizeLimitField key={item.prop} item={item} />
          ))}
        </PanelGrid>
      )}
    </div>
  )
}
