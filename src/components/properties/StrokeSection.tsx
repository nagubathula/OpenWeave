import React from 'react'
import {
  BindableValueRoot,
  useColorBindingProvider,
  useEditor,
  useEditorPropertyList,
  useI18n,
  useStrokeControls
} from '@openweave/react'
import { BLACK } from '@openweave/core/constants'
import { colorToHexRaw } from '@openweave/core/color'
import type { SceneNode, Stroke, StrokeCap, StrokeJoin } from '@openweave/scene-graph'
import { Plus, Eye, EyeOff, Minus, AlignCenter, AlignLeft, AlignRight } from 'lucide-react'

import PanelSection from '@/components/ui/panel/PanelSection'
import IconButton from '@/components/ui/IconButton'
import NumberField from '@/components/inputs/NumberField'
import SegmentedControl from '@/components/ui/SegmentedControl'
import { BindingPill } from '@/components/ui/binding'
import PaintSwatchPopover from '@/components/properties/paint/PaintSwatchPopover'
import { paintBindingTargets, usePaintMutation } from '@/components/properties/paint/binding'
import { commitDiscretePropertyListChange } from '@/components/properties/blend-mode/use'
import SharedStyleField from '@/components/properties/shared-style/SharedStyleField'
import VariableBindingPicker from '@/components/properties/binding/VariableBindingPicker'

const inputClass = 'w-full bg-input/50 rounded px-2 py-1 border border-border text-surface text-xs outline-none focus:border-accent'

export default function StrokeSection() {
  const editor = useEditor()
  const { items: strokes, isMixed, active, activeNode, selectedNodeIds, flush, actions } =
    useEditorPropertyList('strokes')
  const strokeCtx = useStrokeControls()
  const colorProvider = useColorBindingProvider()
  const paint = usePaintMutation()
  const { panels, dialogs } = useI18n()

  if (!active || !activeNode) return null

  const node = activeNode

  // Node-level stroke geometry; values can be mixed across a multi-selection.
  const capValue = typeof strokeCtx.cap === 'string' ? strokeCtx.cap : 'MIXED'
  const joinValue = typeof strokeCtx.join === 'string' ? strokeCtx.join : 'MIXED'
  const dashPattern = ('dashPattern' in node ? node.dashPattern : undefined) ?? []

  /** Applies a node-level patch to every selected node as one undo step. */
  const updateNodeLevel = (patch: Partial<SceneNode>, label: string) => {
    flush()
    const apply = () => {
      for (const id of selectedNodeIds) editor.updateNodeWithUndo(id, patch, label)
    }
    if (selectedNodeIds.length > 1) editor.undo.runBatch(label, apply)
    else apply()
  }

  const setCap = (value: StrokeCap) => {
    flush()
    strokeCtx.setCap(value)
  }

  const setJoin = (value: StrokeJoin) => {
    flush()
    strokeCtx.setJoin(value)
  }

  const addStroke = () => {
    // With a multi-selection this replaces every layer's strokes (mixed included).
    actions.add({ color: BLACK, weight: 1, opacity: 1, visible: true, align: 'CENTER' })
  }

  return (
    <PanelSection
      label="Stroke"
      empty={!isMixed && strokes.length === 0}
      actions={
        <IconButton label="Add stroke" onClick={addStroke}>
          <Plus className="size-3.5" />
        </IconButton>
      }
    >
      <div className="space-y-3">
        <SharedStyleField kind="stroke" label={panels.strokeStyle} />

        {isMixed && <p className="text-[11px] text-muted">{panels.mixedStrokesHelp}</p>}

        {strokes.map((stroke, i) => (
          <div key={i} className="flex flex-col gap-2 relative group pb-2 border-b border-border/50 last:border-0 last:pb-0" data-property="strokes" data-index={i}>
            <div className="flex items-center gap-1.5">
              <BindableValueRoot
                provider={colorProvider}
                targets={paintBindingTargets(selectedNodeIds, 'strokes', i)}
                value={stroke.color}
                batchLabel="Change stroke color"
              >
                {(binding) => {
                  const displayColor = binding.resolvedValue ?? stroke.color
                  return (
                    <div className="flex-1 flex items-center gap-1 bg-input/50 rounded px-1.5 py-1 border border-border focus-within:border-accent transition-colors">
                      <PaintSwatchPopover
                        label="Stroke color"
                        color={displayColor}
                        onChange={(c) =>
                          paint.apply(binding, flush, 'Change stroke color', () =>
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
                          value={colorToHexRaw(stroke.color)}
                          onChange={() => {}} // Let popover handle actual color changes
                          readOnly
                        />
                      )}
                      <div className="w-[1px] h-3 bg-border mx-1"></div>
                      <div className="w-14">
                        <NumberField
                          value={Math.round((stroke.opacity ?? 1) * 100)}
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
                      <VariableBindingPicker
                        triggerLabel={panels.applyVariable}
                        searchPlaceholder={dialogs.search}
                        emptyLabel={panels.noVariablesFound}
                        detachLabel={panels.detachVariable}
                        createLabel={panels.createColorVariable({
                          value: `#${colorToHexRaw(stroke.color)}`
                        })}
                        createNamePlaceholder={panels.variableName}
                        createSubmitLabel={panels.create}
                      />
                    </div>
                  )
                }}
              </BindableValueRoot>
              <IconButton
                label={stroke.visible ? 'Hide stroke' : 'Show stroke'}
                onClick={() => actions.toggleVisibility(i)}
                className={!stroke.visible ? 'opacity-50' : ''}
              >
                {stroke.visible ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
              </IconButton>
              <IconButton label="Remove stroke" onClick={() => actions.remove(i)}>
                <Minus className="size-3.5" />
              </IconButton>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex-1">
                <div className="text-[10px] text-muted mb-1">Weight</div>
                <NumberField
                  value={stroke.weight ?? 1}
                  min={0}
                  onChange={(v) => actions.patch(i, { weight: Math.max(0, v) })}
                  onCommit={(v) =>
                    commitDiscretePropertyListChange(flush, () =>
                      actions.patch(i, { weight: Math.max(0, v) })
                    )
                  }
                />
              </div>
              <div className="flex-[2]">
                <div className="text-[10px] text-muted mb-1">Position</div>
                <SegmentedControl
                  value={stroke.align ?? 'CENTER'}
                  onChange={(v) =>
                    commitDiscretePropertyListChange(flush, () =>
                      actions.patch(i, { align: v as Stroke['align'] })
                    )
                  }
                  options={[
                    { value: 'INSIDE', label: 'Inside', icon: <AlignLeft className="size-3.5" /> },
                    { value: 'CENTER', label: 'Center', icon: <AlignCenter className="size-3.5" /> },
                    { value: 'OUTSIDE', label: 'Outside', icon: <AlignRight className="size-3.5" /> }
                  ]}
                />
              </div>
            </div>
          </div>
        ))}

        {strokes.length > 0 && 'strokeCap' in node && (
          <div className="pt-2 border-t border-border mt-2 space-y-3">

            <div className="flex items-center gap-2">
              <div className="flex-1">
                <div className="text-[10px] text-muted mb-1">Cap</div>
                <select
                  className={inputClass + ' h-6'}
                  value={capValue}
                  data-property="stroke-cap"
                  onChange={(e) => {
                    if (e.target.value === 'MIXED') return
                    setCap(e.target.value as StrokeCap)
                  }}
                >
                  {capValue === 'MIXED' && (
                    <option value="MIXED" disabled hidden>
                      {panels.mixed}
                    </option>
                  )}
                  <option value="NONE">None</option>
                  <option value="ROUND">Round</option>
                  <option value="SQUARE">Square</option>
                  <option value="ARROW_LINES">Arrow</option>
                  <option value="ARROW_EQUILATERAL">Triangle</option>
                </select>
              </div>
              <div className="flex-1">
                <div className="text-[10px] text-muted mb-1">Join</div>
                <select
                  className={inputClass + ' h-6'}
                  value={joinValue}
                  data-property="stroke-join"
                  onChange={(e) => {
                    if (e.target.value === 'MIXED') return
                    setJoin(e.target.value as StrokeJoin)
                  }}
                >
                  {joinValue === 'MIXED' && (
                    <option value="MIXED" disabled hidden>
                      {panels.mixed}
                    </option>
                  )}
                  <option value="MITER">Miter</option>
                  <option value="BEVEL">Bevel</option>
                  <option value="ROUND">Round</option>
                </select>
              </div>
            </div>

            <div className="flex-1">
              <div className="text-[10px] text-muted mb-1">Dashes (e.g. 5, 2)</div>
              <input
                type="text"
                className={inputClass}
                placeholder="None"
                value={dashPattern.join(', ')}
                data-property="stroke-dash"
                onChange={(e) => {
                  const val = e.target.value
                  const dashes = val.split(/[, ]+/).map(Number).filter(n => !isNaN(n))
                  updateNodeLevel({ dashPattern: dashes }, 'Change dash pattern')
                }}
              />
            </div>
          </div>
        )}
      </div>
    </PanelSection>
  )
}
