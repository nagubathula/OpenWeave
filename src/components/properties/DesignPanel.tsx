import { Layers3 } from 'lucide-react'
import React from 'react'

import {
  useSelectionState,
  useSceneComputed,
  useI18n,
  useEditor,
  useEditorCommands
} from '@openweave/react'

import { getActiveEditorStore } from '@/app/editor/active-store'
import { COMPONENT_TYPES, nodeIcon } from '@/app/editor/icons'
import AppearanceSection from '@/components/properties/AppearanceSection'
import ComponentPropertiesSection from '@/components/properties/ComponentPropertiesSection'
import ComponentSetSection from '@/components/properties/ComponentSetSection'
import ConstraintsSection from '@/components/properties/ConstraintsSection'
import EffectsSection from '@/components/properties/EffectsSection'
import ExportSection from '@/components/properties/ExportSection'
import FillSection from '@/components/properties/FillSection'
import FramePresetSelect from '@/components/properties/frame-presets/FramePresetSelect'
import FramePresetsSection from '@/components/properties/FramePresetsSection'
import LayoutGridSection from '@/components/properties/LayoutGridSection'
import LayoutSection from '@/components/properties/LayoutSection'
import MaskSection from '@/components/properties/MaskSection'
import PageSection from '@/components/properties/PageSection'
import PositionSection from '@/components/properties/PositionSection'
import PropertyBindingSection from '@/components/properties/PropertyBindingSection'
import SelectionActionsControl from '@/components/properties/SelectionActionsControl'
import StrokeSection from '@/components/properties/StrokeSection'
import TypographySection from '@/components/properties/TypographySection'
import VariablesSection from '@/components/properties/VariablesSection'
import { AppSelect } from '@/components/ui/AppSelect'
import Tip from '@/components/ui/Tip'

export function DesignPanel() {
  const store = getActiveEditorStore()
  const activeTool = useSceneComputed(() => store.state.activeTool)
  const { selectedNode: node, selectedCount: multiCount } = useSelectionState()
  const showBooleanOperations = multiCount >= 2
  const { getCommand } = useEditorCommands()
  const goToMainComponent = getCommand('selection.goToMainComponent')
  const detachInstance = getCommand('selection.detachInstance')
  const resetOverrides = getCommand('selection.resetOverrides')
  const editor = useEditor()

  // How many overrides + property assignments the selected instance carries
  // (shown on the reset button as an override-inspection hint).
  const overrideCount = useSceneComputed(() => {
    void editor.state.sceneVersion
    const selected = editor.getSelectedNodes()[0]
    if (selected?.type !== 'INSTANCE') return 0
    return (
      Object.keys(selected.overrides).length +
      Object.keys(selected.componentPropertyAssignments).length
    )
  })

  // Free-form "swap main component" options for the instance header.
  const swapOptions = useSceneComputed<{ value: string; label: string }[]>(() => {
    void editor.state.sceneVersion
    const selected = editor.getSelectedNodes()[0]
    if (selected?.type !== 'INSTANCE') return []
    return [...editor.graph.getAllNodes()]
      .filter((n) => n.type === 'COMPONENT')
      .map((n) => ({ value: n.id, label: n.name }))
      .sort((a, b) => a.label.localeCompare(b.label))
  })

  const isComponentType = node?.type ? COMPONENT_TYPES.has(node.type) : false
  const SelectedIcon = node ? nodeIcon(node) : undefined
  const supportsLayoutGuides =
    node?.type === 'FRAME' ||
    node?.type === 'COMPONENT' ||
    node?.type === 'COMPONENT_SET' ||
    node?.type === 'INSTANCE'
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
      <div
        data-test-id="design-panel-multi"
        className="scrollbar-thin flex-1 overflow-x-hidden overflow-y-auto space-y-0 pb-4"
      >
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
      <div
        data-test-id="design-panel-single"
        className="scrollbar-thin flex-1 overflow-x-hidden overflow-y-auto pb-4 space-y-0"
      >
        <div className="flex items-center justify-between border-b border-border p-3 group">
          <div className="flex items-center gap-2 min-w-0">
            {SelectedIcon && (
              <Tip label={node.type}>
                <SelectedIcon
                  role="img"
                  aria-label={node.type}
                  className={`size-3.5 ${isComponentType ? 'text-component' : 'text-muted'}`}
                />
              </Tip>
            )}
            <span
              role="heading"
              aria-level={3}
              className={`text-xs font-semibold truncate ${isComponentType ? 'text-component' : 'text-surface'}`}
            >
              {node.name}
            </span>
          </div>
          <SelectionActionsControl />
        </div>

        {node.type === 'INSTANCE' && (
          <div className="flex flex-col gap-1 border-b border-border px-3 py-2">
            {swapOptions.length > 1 && (
              <div data-test-id="instance-swap-select">
                <AppSelect
                  label={panels.swapInstance}
                  options={swapOptions}
                  value={node.componentId ?? ''}
                  onValueChange={(componentId) => {
                    if (componentId && componentId !== node.componentId) {
                      editor.swapInstance(componentId)
                    }
                  }}
                />
              </div>
            )}
            <button
              type="button"
              className="rounded bg-component/10 px-2 py-1 text-left text-[11px] text-component hover:bg-component/20"
              onClick={() => goToMainComponent.run()}
            >
              {panels.goToMainComponent}
            </button>
            {resetOverrides.enabled && (
              <button
                type="button"
                data-test-id="instance-reset-overrides"
                className="rounded px-2 py-1 text-left text-[11px] text-muted hover:bg-hover"
                onClick={() => resetOverrides.run()}
              >
                {panels.resetOverrides}
                {overrideCount > 0 ? ` · ${overrideCount}` : ''}
              </button>
            )}
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
        {(node.type === 'COMPONENT_SET' || node.type === 'COMPONENT') && <ComponentSetSection />}
        <PropertyBindingSection />
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
    <div
      data-test-id="design-panel-empty"
      className="scrollbar-thin flex-1 overflow-x-hidden overflow-y-auto pb-4 space-y-0"
    >
      <PageSection />
      <VariablesSection />
      <ExportSection />
    </div>
  )
}

export default DesignPanel
