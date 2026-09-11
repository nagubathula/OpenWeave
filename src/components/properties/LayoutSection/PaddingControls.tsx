/* eslint-disable openweave/no-hardcoded-tip-labels */
import { createLucideIcon, PanelBottom, PanelLeft, PanelRight, PanelTop } from 'lucide-react'
import React from 'react'

import { useLayoutControlsContext } from '@openweave/react'

import type { PaddingProp } from '@/components/properties/LayoutSection/types'
import VariableNumberField from '@/components/properties/LayoutSection/VariableNumberField'
import IconButton from '@/components/ui/IconButton'
import PanelGrid from '@/components/ui/panel/PanelGrid'
import Tip from '@/components/ui/Tip'

const HorizontalPaddingIcon = createLucideIcon('HorizontalPaddingIcon', [
  ['rect', { x: '1.5', y: '2.5', width: '11', height: '9', rx: '1.5', key: 'r1' }],
  ['line', { x1: '4.5', y1: '2.5', x2: '4.5', y2: '11.5', key: 'l1' }],
  ['line', { x1: '9.5', y1: '2.5', x2: '9.5', y2: '11.5', key: 'l2' }]
])

const VerticalPaddingIcon = createLucideIcon('VerticalPaddingIcon', [
  ['rect', { x: '1.5', y: '2.5', width: '11', height: '9', rx: '1.5', key: 'r1' }],
  ['line', { x1: '1.5', y1: '5.5', x2: '12.5', y2: '5.5', key: 'l1' }],
  ['line', { x1: '1.5', y1: '8.5', x2: '12.5', y2: '8.5', key: 'l2' }]
])

const IndependentPaddingIcon = createLucideIcon('IndependentPaddingIcon', [
  ['path', { d: 'M4.5 2H2.5v2.5M9.5 2h2v2.5M11.5 9.5v2h-2M4.5 11.5h-2v-2', key: 'p1' }],
  ['rect', { x: '5.2', y: '5.2', width: '3.6', height: '3.6', rx: '0.5', key: 'r1' }]
])

const PADDING_SIDES: { prop: PaddingProp; icon: React.ReactNode }[] = [
  { prop: 'paddingTop', icon: <PanelTop className="size-3.5" /> },
  { prop: 'paddingRight', icon: <PanelRight className="size-3.5" /> },
  { prop: 'paddingBottom', icon: <PanelBottom className="size-3.5" /> },
  { prop: 'paddingLeft', icon: <PanelLeft className="size-3.5" /> }
]

/**
 * Padding editor matching Figma UI3:
 * Horizontal and vertical padding inputs with independent padding toggle.
 */
export default function PaddingControls() {
  const ctx = useLayoutControlsContext()
  const { node } = ctx

  const isIndividual = ctx.showIndividualPadding || !ctx.hasSymmetricPadding

  return (
    <div className="mt-2">
      <div className="mb-1 flex items-center justify-between">
        <label className="text-[11px] text-muted">Padding</label>
        {isIndividual && (
          <Tip label="Independent padding">
            <IconButton
              label="Independent padding"
              size="md"
              active={true}
              onClick={ctx.toggleIndividualPadding}
            >
              <IndependentPaddingIcon />
            </IconButton>
          </Tip>
        )}
      </div>

      {!isIndividual ? (
        <div className="flex items-center gap-1.5">
          <div className="grid min-w-0 flex-1 grid-cols-2 gap-1.5">
            <VariableNumberField
              dataTestId="layout-horizontal-padding-input"
              value={Math.round(node.paddingLeft)}
              min={0}
              nodeId={node.id}
              bindingPath="paddingLeft"
              icon={<HorizontalPaddingIcon />}
              onChange={ctx.setHorizontalPadding}
              onCommit={ctx.commitHorizontalPadding}
            />
            <VariableNumberField
              dataTestId="layout-vertical-padding-input"
              value={Math.round(node.paddingTop)}
              min={0}
              nodeId={node.id}
              bindingPath="paddingTop"
              icon={<VerticalPaddingIcon />}
              onChange={ctx.setVerticalPadding}
              onCommit={ctx.commitVerticalPadding}
            />
          </div>

          <Tip label="Independent padding">
            <IconButton
              label="Independent padding"
              size="md"
              active={false}
              onClick={ctx.toggleIndividualPadding}
            >
              <IndependentPaddingIcon />
            </IconButton>
          </Tip>
        </div>
      ) : (
        <PanelGrid columns={2}>
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
      )}
    </div>
  )
}
