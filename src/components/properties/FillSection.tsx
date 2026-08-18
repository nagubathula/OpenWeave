import { Plus, Eye, EyeOff, Minus } from 'lucide-react'
import React from 'react'

import { colorToHexRaw } from '@openweave/core/color'
import { BLACK } from '@openweave/core/constants'
import {
  BindableValueRoot,
  useColorBindingProvider,
  useEditorPropertyList,
  useI18n,
  useOkHCL,
  useSelectionState
} from '@openweave/react'
import type { Fill } from '@openweave/scene-graph'

import NumberField from '@/components/inputs/NumberField'
import VariableBindingPicker from '@/components/properties/binding/VariableBindingPicker'
import {
  commitDiscretePropertyListChange,
  useBlendModeOptions
} from '@/components/properties/blend-mode/use'
import { FillRow as ComplexFillEditor } from '@/components/properties/FillEditor'
import { paintBindingTargets, usePaintMutation } from '@/components/properties/paint/binding'
import { createFillOkhclAdapter } from '@/components/properties/paint/okhcl'
import PaintSwatchPopover from '@/components/properties/paint/PaintSwatchPopover'
import SharedStyleField from '@/components/properties/shared-style/SharedStyleField'
import { AppSelect } from '@/components/ui/AppSelect'
import { BindingPill } from '@/components/ui/binding'
import IconButton from '@/components/ui/IconButton'
import PanelSection from '@/components/ui/panel/PanelSection'

export default function FillSection() {
  const {
    items: fills,
    isMixed,
    active,
    selectedNodeIds,
    flush,
    actions
  } = useEditorPropertyList('fills')
  const colorProvider = useColorBindingProvider()
  const paint = usePaintMutation()
  const { panels, dialogs } = useI18n()
  const okhcl = useOkHCL()
  const { selectedNode } = useSelectionState()
  const blendOptions = useBlendModeOptions()

  if (!active) return null

  const addFill = () => {
    // With a multi-selection this replaces every layer's fills (mixed included).
    actions.add({ type: 'SOLID', color: BLACK, opacity: 1, visible: true })
  }

  return (
    <PanelSection
      label="Fill"
      empty={!isMixed && fills.length === 0}
      actions={
        <IconButton label="Add fill" onClick={addFill}>
          <Plus className="size-3.5" />
        </IconButton>
      }
    >
      <div className="space-y-3">
        <SharedStyleField kind="fill" label={panels.fillStyle} />

        {isMixed && <p className="text-[11px] text-muted">{panels.mixedFillsHelp}</p>}

        {fills.map((fill, i) => (
          <div
            key={i}
            className="flex flex-col gap-2 relative group"
            data-property="fills"
            data-index={i}
          >
            <div className="flex items-center gap-1.5">
              <BindableValueRoot
                provider={colorProvider}
                targets={paintBindingTargets(selectedNodeIds, 'fills', i)}
                value={fill.color}
                batchLabel="Change fill color"
              >
                {(binding) => {
                  const displayColor = binding.resolvedValue ?? fill.color
                  return (
                    <div className="flex-1 flex items-center gap-1 bg-input/50 rounded px-1.5 py-1 border border-border focus-within:border-accent transition-colors">
                      {fill.type === 'SOLID' ? (
                        <>
                          <PaintSwatchPopover
                            label="Fill color"
                            dataTestId="fill-picker-swatch"
                            color={displayColor}
                            okhcl={createFillOkhclAdapter(okhcl, selectedNode, i)}
                            onChange={(c) =>
                              paint.apply(binding, flush, 'Change fill color', () =>
                                actions.patch(i, { color: c })
                              )
                            }
                            onOpenChange={(open) => {
                              if (!open) paint.commit()
                            }}
                            onCancel={() => paint.rollback()}
                          />
                          {binding.variable ? (
                            <BindingPill
                              className="w-14"
                              label={binding.variable.name}
                              tooltip={`${binding.variable.name} · #${colorToHexRaw(displayColor)}`}
                            />
                          ) : (
                            <input
                              type="text"
                              data-property="color-hex"
                              className="w-14 bg-transparent outline-none text-xs text-surface font-mono uppercase"
                              value={colorToHexRaw(fill.color)}
                              onChange={() => {}} // Let popover handle actual color changes for simplicity
                              readOnly
                            />
                          )}
                        </>
                      ) : (
                        <div className="flex-1 text-xs truncate">Multiple / Gradient</div>
                      )}
                      <div className="w-[1px] h-3 bg-border mx-1"></div>
                      <div className="w-14">
                        <NumberField
                          value={Math.round((fill.opacity ?? 1) * 100)}
                          min={0}
                          max={100}
                          suffix="%"
                          onChange={(v) => actions.patch(i, { opacity: v / 100 })}
                          onCommit={(v) =>
                            commitDiscretePropertyListChange(flush, () =>
                              actions.patch(i, { opacity: v / 100 })
                            )
                          }
                        />
                      </div>
                      {fill.type === 'SOLID' && (
                        <VariableBindingPicker
                          triggerLabel={panels.applyVariable}
                          searchPlaceholder={dialogs.search}
                          emptyLabel={panels.noVariablesFound}
                          detachLabel={panels.detachVariable}
                          createLabel={panels.createColorVariable({
                            value: `#${colorToHexRaw(fill.color)}`
                          })}
                          createNamePlaceholder={panels.variableName}
                          createSubmitLabel={panels.create}
                        />
                      )}
                    </div>
                  )
                }}
              </BindableValueRoot>
              <IconButton
                label={panels.toggleVisibility}
                onClick={() => actions.toggleVisibility(i)}
                className={!fill.visible ? 'opacity-50' : ''}
              >
                {fill.visible ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
              </IconButton>
              <IconButton label="Remove fill" onClick={() => actions.remove(i)}>
                <Minus className="size-3.5" />
              </IconButton>
            </div>
            {/* Extended properties: Blend mode */}
            <div className="pl-1" data-property="fill-blend-mode">
              <div className="text-[10px] text-muted mb-1">Blend mode</div>
              <AppSelect
                label={panels.blendMode}
                options={blendOptions}
                value={fill.blendMode ?? 'NORMAL'}
                onValueChange={(value) =>
                  commitDiscretePropertyListChange(flush, () =>
                    actions.patch(i, { blendMode: value as Fill['blendMode'] })
                  )
                }
              />
            </div>
            {/* If it's not SOLID, render the advanced editor below */}
            {fill.type !== 'SOLID' && (
              <div className="mt-2 pl-1 border-l-2 border-border/50">
                <ComplexFillEditor
                  fill={fill}
                  onChange={(f) => actions.update(i, f)}
                  onRemove={() => actions.remove(i)}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </PanelSection>
  )
}
