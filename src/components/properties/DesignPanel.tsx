import React from 'react'
import {
  useSelectionState,
  useI18n,
  useEditorCommands
} from '@openweave/react'
import { getActiveEditorStore } from '@/app/editor/active-store'
import { COMPONENT_TYPES, nodeIcon } from '@/app/editor/icons'
import { Layers3 } from 'lucide-react'

import LayoutSection from '@/components/properties/LayoutSection'
import ConstraintsSection from '@/components/properties/ConstraintsSection'
import PositionSection from '@/components/properties/PositionSection'
import TypographySection from '@/components/properties/TypographySection'
import FramePresetsSection from '@/components/properties/FramePresetsSection'
import ComponentPropertiesSection from '@/components/properties/ComponentPropertiesSection'
import FillSection from '@/components/properties/FillSection'
import StrokeSection from '@/components/properties/StrokeSection'
import EffectsSection from '@/components/properties/EffectsSection'
import ExportSection from '@/components/properties/ExportSection'
import AppearanceSection from '@/components/properties/AppearanceSection'
import PageSection from '@/components/properties/PageSection'
import VariablesSection from '@/components/properties/VariablesSection'
import MaskSection from '@/components/properties/MaskSection'
import LayoutGridSection from '@/components/properties/LayoutGridSection'
import SelectionActionsControl from '@/components/properties/SelectionActionsControl'
import FramePresetSelect from '@/components/properties/frame-presets/FramePresetSelect'
import Tip from '@/components/ui/Tip'

export function DesignPanel() {
  const store = getActiveEditorStore()
  const activeTool = store.state.activeTool
  const { selectedNode: node, selectedCount: multiCount } = useSelectionState()
  const showBooleanOperations = multiCount >= 2
  const { getCommand } = useEditorCommands()
  const goToMainComponent = getCommand('selection.goToMainComponent')
  const detachInstance = getCommand('selection.detachInstance')

  const isComponentType = node?.type ? COMPONENT_TYPES.has(node.type) : false
  const SelectedIcon = node ? nodeIcon(node) : undefined
  const supportsLayoutGuides = node?.type === 'FRAME' || node?.type === 'COMPONENT' || node?.type === 'COMPONENT_SET' || node?.type === 'INSTANCE'
  const { panels } = useI18n()

  if (activeTool === 'FRAME') {
    return (
      <div className="scrollbar-thin flex-1 overflow-x-hidden overflow-y-auto pb-4 space-y-4">
        <FramePresetsSection />
      </div>
    )
  }

  if (multiCount > 1) {
    return (
      <div data-test-id="design-panel-multi" className="scrollbar-thin flex-1 overflow-x-hidden overflow-y-auto space-y-0 pb-4">
        <div className="flex items-center gap-2 border-b border-border p-3">
          <Layers3 className="size-4 text-muted" />
          <span className="text-xs font-semibold text-surface flex-1">
            {panels.layersCount({ count: String(multiCount) })}
          </span>
          <SelectionActionsControl showBooleanOperations={showBooleanOperations} />
        </div>
        <ComponentPropertiesSection />
        <PositionSection />
        <ConstraintsSection />
        <AppearanceSection />
        <FillSection />
        <StrokeSection />
        <EffectsSection />
        <ExportSection />
      </div>
    )
  }

  if (node) {
    return (
      <div data-test-id="design-panel-single" className="scrollbar-thin flex-1 overflow-x-hidden overflow-y-auto pb-4 space-y-0">
        <div className="flex items-center justify-between border-b border-border p-3 group">
          <div className="flex items-center gap-2 min-w-0">
            {SelectedIcon && (
              <Tip label={node.type}>
                <SelectedIcon className={`size-3.5 ${isComponentType ? 'text-component' : 'text-muted'}`} />
              </Tip>
            )}
            <span className={`text-xs font-semibold truncate ${isComponentType ? 'text-component' : 'text-surface'}`}>{node.name}</span>
          </div>
          <SelectionActionsControl />
        </div>

        {node.type === 'INSTANCE' && (
          <div className="flex flex-col gap-1 border-b border-border px-3 py-2">
            <button
              type="button"
              className="rounded bg-component/10 px-2 py-1 text-left text-[11px] text-component hover:bg-component/20"
              onClick={() => goToMainComponent.run()}
            >
              {panels.goToMainComponent}
            </button>
            <button
              type="button"
              className="rounded px-2 py-1 text-left text-[11px] text-muted hover:bg-hover"
              onClick={() => detachInstance.run()}
            >
              {panels.detachInstance}
            </button>
          </div>
        )}

        {node.type === 'INSTANCE' && <ComponentPropertiesSection />}
        {node.type === 'FRAME' && <FramePresetSelect />}

        <PositionSection />
        <ConstraintsSection />
        <LayoutSection />
        <AppearanceSection />
        <MaskSection />
        {node.type === 'TEXT' && <TypographySection />}
        <FillSection />
        <StrokeSection />
        {supportsLayoutGuides && <LayoutGridSection />}
        <EffectsSection />

        <ExportSection />
      </div>
    )
  }

  return (
    <div data-test-id="design-panel-empty" className="scrollbar-thin flex-1 overflow-x-hidden overflow-y-auto pb-4 space-y-0">
      <PageSection />
      <VariablesSection />
      <ExportSection />
    </div>
  )
}

export default DesignPanel
