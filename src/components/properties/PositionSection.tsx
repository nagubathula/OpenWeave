import {
  AlignStartVertical,
  AlignCenterVertical,
  AlignEndVertical,
  AlignStartHorizontal,
  AlignCenterHorizontal,
  AlignEndHorizontal,
  RotateCw,
  FlipHorizontal2,
  FlipVertical2,
  RotateCwSquare
} from 'lucide-react'
/* eslint-disable openweave/no-hardcoded-tip-labels */
import React from 'react'

import { PositionControlsRoot, useI18n } from '@openweave/react'

import { useEditorStore } from '@/app/editor/active-store'
import NumberField from '@/components/inputs/NumberField'
import IconButton from '@/components/ui/IconButton'
import PanelGrid from '@/components/ui/panel/PanelGrid'
import PanelSection from '@/components/ui/panel/PanelSection'
import Tip from '@/components/ui/Tip'

export default function PositionSection() {
  const store = useEditorStore()
  const { panels } = useI18n()

  function handleAlign(
    nodeAlign: (axis: 'horizontal' | 'vertical', pos: 'min' | 'center' | 'max') => void,
    axis: 'horizontal' | 'vertical',
    pos: 'min' | 'center' | 'max'
  ) {
    const editState = store.state?.nodeEditState
    if (editState && editState.selectedVertexIndices.size >= 2) {
      store.nodeEditAlignVertices(axis, pos)
    } else {
      nodeAlign(axis, pos)
    }
  }

  return (
    <PositionControlsRoot>
      {({ active, isMulti, xValue, yValue, wValue, hValue, rotationValue, actions }) =>
        active ? (
          <PanelSection label="Position">
            <div role="toolbar" aria-label="Position" className="mb-1.5 flex justify-between">
              <div className="flex gap-0.5">
                <IconButton
                  label="Align left"
                  size="md"
                  onClick={() => handleAlign(actions.align, 'horizontal', 'min')}
                >
                  <AlignStartVertical className="size-3.5" />
                </IconButton>
                <IconButton
                  label="Align horizontal centers"
                  size="md"
                  onClick={() => handleAlign(actions.align, 'horizontal', 'center')}
                >
                  <AlignCenterVertical className="size-3.5" />
                </IconButton>
                <IconButton
                  label="Align right"
                  size="md"
                  onClick={() => handleAlign(actions.align, 'horizontal', 'max')}
                >
                  <AlignEndVertical className="size-3.5" />
                </IconButton>
              </div>
              <div className="flex gap-0.5">
                <IconButton
                  label="Align top"
                  size="md"
                  onClick={() => handleAlign(actions.align, 'vertical', 'min')}
                >
                  <AlignStartHorizontal className="size-3.5" />
                </IconButton>
                <IconButton
                  label="Align vertical centers"
                  size="md"
                  onClick={() => handleAlign(actions.align, 'vertical', 'center')}
                >
                  <AlignCenterHorizontal className="size-3.5" />
                </IconButton>
                <IconButton
                  label="Align bottom"
                  size="md"
                  onClick={() => handleAlign(actions.align, 'vertical', 'max')}
                >
                  <AlignEndHorizontal className="size-3.5" />
                </IconButton>
              </div>
            </div>

            <PanelGrid columns={2}>
              <Tip label="X">
                <NumberField
                  icon="X"
                  ariaLabel={panels.xAxis}
                  dataProperty="x"
                  value={xValue}
                  onChange={(v) => actions.updateProp('x', v)}
                  onCommit={(v, p) => actions.commitProp('x', v, p)}
                />
              </Tip>
              <Tip label="Y">
                <NumberField
                  icon="Y"
                  ariaLabel={panels.yAxis}
                  dataProperty="y"
                  value={yValue}
                  onChange={(v) => actions.updateProp('y', v)}
                  onCommit={(v, p) => actions.commitProp('y', v, p)}
                />
              </Tip>
            </PanelGrid>

            {isMulti && (
              <PanelGrid columns={2} className="mt-1.5">
                <Tip label="Width">
                  <NumberField
                    icon="W"
                    ariaLabel={panels.width}
                    dataProperty="width"
                    value={wValue}
                    min={1}
                    onChange={(v) => actions.updateProp('width', v)}
                    onCommit={(v, p) => actions.commitProp('width', v, p)}
                  />
                </Tip>
                <Tip label="Height">
                  <NumberField
                    icon="H"
                    ariaLabel={panels.height}
                    dataProperty="height"
                    value={hValue}
                    min={1}
                    onChange={(v) => actions.updateProp('height', v)}
                    onCommit={(v, p) => actions.commitProp('height', v, p)}
                  />
                </Tip>
              </PanelGrid>
            )}
            <PanelGrid columns={2} className="mt-1.5">
              <Tip label="Rotation">
                <NumberField
                  suffix="°"
                  ariaLabel={panels.rotation}
                  dataProperty="rotation"
                  value={rotationValue}
                  min={-360}
                  max={360}
                  onChange={(v) => actions.updateProp('rotation', v)}
                  onCommit={(v, p) => actions.commitProp('rotation', v, p)}
                  icon={<RotateCw className="size-3" />}
                />
              </Tip>
              <div className="flex h-6 items-center justify-end gap-0.5">
                <IconButton
                  label="Flip horizontal"
                  size="md"
                  onClick={() => actions.flip('horizontal')}
                >
                  <FlipHorizontal2 className="size-3.5" />
                </IconButton>
                <IconButton
                  label="Flip vertical"
                  size="md"
                  onClick={() => actions.flip('vertical')}
                >
                  <FlipVertical2 className="size-3.5" />
                </IconButton>
                <IconButton label="Rotate -90°" size="md" onClick={() => actions.rotate(90)}>
                  <RotateCwSquare className="size-3.5" />
                </IconButton>
              </div>
            </PanelGrid>
          </PanelSection>
        ) : null
      }
    </PositionControlsRoot>
  )
}
