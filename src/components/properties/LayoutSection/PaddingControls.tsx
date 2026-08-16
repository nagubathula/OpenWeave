import React from 'react'
import { useLayoutControlsContext } from '@openweave/react'
import {
  PanelBottom,
  PanelLeft,
  PanelRight,
  PanelTop,
  SeparatorHorizontal,
  SeparatorVertical
} from 'lucide-react'

import PanelGrid from '@/components/ui/panel/PanelGrid'
import VariableNumberField from '@/components/properties/LayoutSection/VariableNumberField'
import type { PaddingProp } from '@/components/properties/LayoutSection/types'

const PADDING_SIDES: { prop: PaddingProp; icon: React.ReactNode }[] = [
  { prop: 'paddingTop', icon: <PanelTop className="size-3.5" /> },
  { prop: 'paddingRight', icon: <PanelRight className="size-3.5" /> },
  { prop: 'paddingBottom', icon: <PanelBottom className="size-3.5" /> },
  { prop: 'paddingLeft', icon: <PanelLeft className="size-3.5" /> }
]

/**
 * Padding editor: a combined horizontal/vertical pair while padding is
 * symmetric and not expanded, or four independent side fields once expanded
 * (via the flex gap row's toggle button) or for grid containers.
 */
export default function PaddingControls() {
  const ctx = useLayoutControlsContext()
  const { node } = ctx

  if (!ctx.showIndividualPadding && ctx.hasSymmetricPadding) {
    return (
      <PanelGrid columns={2} className="mt-1.5">
        <VariableNumberField
          dataTestId="layout-horizontal-padding-input"
          value={Math.round(node.paddingLeft)}
          min={0}
          nodeId={node.id}
          bindingPath="paddingLeft"
          icon={<SeparatorVertical className="size-3.5" />}
          onChange={ctx.setHorizontalPadding}
          onCommit={ctx.commitHorizontalPadding}
        />
        <VariableNumberField
          dataTestId="layout-vertical-padding-input"
          value={Math.round(node.paddingTop)}
          min={0}
          nodeId={node.id}
          bindingPath="paddingTop"
          icon={<SeparatorHorizontal className="size-3.5" />}
          onChange={ctx.setVerticalPadding}
          onCommit={ctx.commitVerticalPadding}
        />
      </PanelGrid>
    )
  }

  if (ctx.isGrid || ctx.isFlex) {
    return (
      <PanelGrid columns={2} className="mt-1.5">
        {PADDING_SIDES.map((side) => (
          <VariableNumberField
            key={side.prop}
            value={Math.round(node[side.prop])}
            min={0}
            nodeId={node.id}
            bindingPath={side.prop}
            icon={side.icon}
            onChange={(v) => ctx.updateProp(side.prop, v)}
            onCommit={(v, p) => ctx.commitProp(side.prop, v, p)}
          />
        ))}
      </PanelGrid>
    )
  }

  return null
}
