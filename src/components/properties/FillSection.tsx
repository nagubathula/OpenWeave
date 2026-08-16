import React from 'react'
import {
  BindableValueRoot,
  useColorBindingProvider,
  useEditorPropertyList,
  useI18n
} from '@openweave/react'
import { BLACK } from '@openweave/core/constants'
import { colorToHexRaw } from '@openweave/core/color'
import type { Fill } from '@openweave/scene-graph'
import { Plus, Eye, EyeOff, Minus } from 'lucide-react'

import PanelSection from '@/components/ui/panel/PanelSection'
import IconButton from '@/components/ui/IconButton'
import NumberField from '@/components/inputs/NumberField'
import { BindingPill } from '@/components/ui/binding'
import { FillRow as ComplexFillEditor } from '@/components/properties/FillEditor'
import PaintSwatchPopover from '@/components/properties/paint/PaintSwatchPopover'
import { paintBindingTargets, usePaintMutation } from '@/components/properties/paint/binding'
import { commitDiscretePropertyListChange } from '@/components/properties/blend-mode/use'
import SharedStyleField from '@/components/properties/shared-style/SharedStyleField'
import VariableBindingPicker from '@/components/properties/binding/VariableBindingPicker'

const inputClass = 'w-full bg-input/50 rounded px-2 py-1 border border-border text-surface text-xs outline-none focus:border-accent'

export default function FillSection() {
  const { items: fills, isMixed, active, selectedNodeIds, flush, actions } =
    useEditorPropertyList('fills')
  const colorProvider = useColorBindingProvider()
  const paint = usePaintMutation()
  const { panels, dialogs } = useI18n()

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
          <div key={i} className="flex flex-col gap-2 relative group" data-property="fills" data-index={i}>
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
                            color={displayColor}
                            onChange={(c) =>
                              paint.apply(binding, flush, 'Change fill color', () =>
                                actions.patch(i, { color: c })
                              )
                            }
                            onOpenChange={(open) => {
                              if (!open) paint.commit()
                            }}
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
                label={fill.visible ? 'Hide fill' : 'Show fill'}
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
            <div className="pl-1">
              <div className="text-[10px] text-muted mb-1">Blend mode</div>
              <select
                className={inputClass + ' h-6 w-full'}
                value={fill.blendMode ?? 'NORMAL'}
                data-property="fill-blend-mode"
                onChange={(e) =>
                  commitDiscretePropertyListChange(flush, () =>
                    actions.patch(i, { blendMode: e.target.value as Fill['blendMode'] })
                  )
                }
              >
                <option value="NORMAL">Normal</option>
                <option value="DARKEN">Darken</option>
                <option value="MULTIPLY">Multiply</option>
                <option value="COLOR_BURN">Color burn</option>
                <option value="LIGHTEN">Lighten</option>
                <option value="SCREEN">Screen</option>
                <option value="COLOR_DODGE">Color dodge</option>
                <option value="OVERLAY">Overlay</option>
                <option value="SOFT_LIGHT">Soft light</option>
                <option value="HARD_LIGHT">Hard light</option>
                <option value="DIFFERENCE">Difference</option>
                <option value="EXCLUSION">Exclusion</option>
                <option value="HUE">Hue</option>
                <option value="SATURATION">Saturation</option>
                <option value="COLOR">Color</option>
                <option value="LUMINOSITY">Luminosity</option>
              </select>
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
