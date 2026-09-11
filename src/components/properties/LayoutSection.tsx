'use client'

import { LayoutPanelTop } from 'lucide-react'
import React from 'react'

import { LayoutControlsRoot, useI18n, useLayoutControlsContext } from '@openweave/react'
import type { LayoutMode, NodeType } from '@openweave/scene-graph'

import AutoLayoutControls from '@/components/properties/LayoutSection/AutoLayoutControls'
import ClipContentControl from '@/components/properties/LayoutSection/ClipContentControl'
import FlexControls from '@/components/properties/LayoutSection/FlexControls'
import GridChildControls from '@/components/properties/LayoutSection/GridChildControls'
import GridControls from '@/components/properties/LayoutSection/GridControls'
import PaddingControls from '@/components/properties/LayoutSection/PaddingControls'
import SizeControls from '@/components/properties/LayoutSection/size/SizeControls'
import TextResizingControl from '@/components/properties/LayoutSection/TextResizingControl'
import IconButton from '@/components/ui/IconButton'
import PanelSection from '@/components/ui/panel/PanelSection'

const CONTAINER_TYPES = new Set<NodeType>([
  'FRAME',
  'COMPONENT',
  'COMPONENT_SET',
  'INSTANCE',
  'SECTION'
])

/**
 * Layout / Auto layout panel section.
 *
 * Renders for any selected node — only the auto-layout sub-controls (flow,
 * flex, grid, clip content) are gated to container types. Size (W/H, size
 * limits) and, for text, the resize mode apply to every node, mirroring the
 * old Vue LayoutSection's v-if structure.
 */
export default function LayoutSection() {
  return (
    <LayoutControlsRoot>
      <LayoutSectionContent />
    </LayoutControlsRoot>
  )
}

function LayoutSectionContent() {
  const ctx = useLayoutControlsContext()
  const { panels } = useI18n()
  const { node, editor, isFlex, isGrid } = ctx
  const isContainer = CONTAINER_TYPES.has(node.type)
  const hasAutoLayout = node.layoutMode !== 'NONE'

  return (
    <div data-test-id="layout-section">
      <PanelSection
        label={hasAutoLayout ? panels.autoLayout : panels.layout}
        actions={
          isContainer ? (
            <IconButton
              label={hasAutoLayout ? panels.removeAutoLayout : panels.addAutoLayout}
              size="md"
              active={hasAutoLayout}
              className="data-[state=on]:bg-accent/15"
              onClick={() =>
                editor.setLayoutMode(node.id, (hasAutoLayout ? 'NONE' : 'VERTICAL') as LayoutMode)
              }
            >
              <LayoutPanelTop className="size-3.5" />
            </IconButton>
          ) : undefined
        }
      >
        {isContainer && <AutoLayoutControls />}
        {node.type === 'TEXT' && <TextResizingControl />}

        {isContainer && hasAutoLayout ? (
          <>
            {isFlex && <FlexControls />}
            {isGrid && <GridControls />}
            <PaddingControls />
            <SizeControls />
          </>
        ) : (
          <SizeControls />
        )}

        {isContainer && <ClipContentControl />}
        <GridChildControls />
      </PanelSection>
    </div>
  )
}
