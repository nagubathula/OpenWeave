import { Plus, Eye, EyeOff, Minus, AlignCenter, AlignLeft, AlignRight } from 'lucide-react'
import React from 'react'

import { colorToHexRaw } from '@openweave/core/color'
import { BLACK } from '@openweave/core/constants'
import {
  BindableValueRoot,
  useColorBindingProvider,
  useEditor,
  useEditorPropertyList,
  useI18n,
  useOkHCL,
  useStrokeControls
} from '@openweave/react'
import type { SceneNode, Stroke, StrokeCap, StrokeJoin } from '@openweave/scene-graph'

import NumberField from '@/components/inputs/NumberField'
import VariableBindingPicker from '@/components/properties/binding/VariableBindingPicker'
import { commitDiscretePropertyListChange } from '@/components/properties/blend-mode/use'
import { paintBindingTargets, usePaintMutation } from '@/components/properties/paint/binding'
import { createStrokeOkhclAdapter } from '@/components/properties/paint/okhcl'
import PaintSwatchPopover from '@/components/properties/paint/PaintSwatchPopover'
import SharedStyleField from '@/components/properties/shared-style/SharedStyleField'
import { BindingPill } from '@/components/ui/binding'
import IconButton from '@/components/ui/IconButton'
import PanelSection from '@/components/ui/panel/PanelSection'
import SegmentedControl from '@/components/ui/SegmentedControl'

const inputClass =
  'w-full bg-input/50 rounded px-2 py-1 border border-border text-surface text-xs outline-none focus:border-accent'

export default function StrokeSection() {
  const editor = useEditor()
  const {
    items: strokes,
    isMixed,
    active,
    activeNode: propertyNode,
    selectedNodeIds,
    flush,
    actions
  } = useEditorPropertyList('strokes')
  const strokeCtx = useStrokeControls()
  const colorProvider = useColorBindingProvider()
  const paint = usePaintMutation()
  const { panels, dialogs } = useI18n()
  const okhcl = useOkHCL()

  if (!active || !propertyNode) return null

  const node = propertyNode

  // Node-level stroke geometry; values can be mixed across a multi-selection.
  const capValue = typeof strokeCtx.cap === 'string' ? strokeCtx.cap : 'MIXED'
  const joinValue = typeof strokeCtx.join === 'string' ? strokeCtx.join : 'MIXED'
  const dashPattern = ('dashPattern' in node ? node.dashPattern : undefined) ?? []
  const sidesExpanded = node.independentStrokeWeights
  // ARROW_LINES/ARROW_EQUILATERAL have no SDK-provided options entry yet.
  const capOptions = [
    ...strokeCtx.capOptions,
    { value: 'ARROW_LINES', label: 'Arrow cap' },
    { value: 'ARROW_EQUILATERAL', label: 'Triangle cap' }
  ]

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
          <div
            key={i}
            className="flex flex-col gap-2 relative group pb-2 border-b border-border/50 last:border-0 last:pb-0"
            data-property="strokes"
            data-index={i}
          >
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
                        okhcl={createStrokeOkhclAdapter(okhcl, node, i)}
                        onChange={(c) =>
                          paint.apply(binding, flush, 'Change stroke color', () =>
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
                label={panels.toggleVisibility}
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
                    {
                      value: 'CENTER',
                      label: 'Center',
                      icon: <AlignCenter className="size-3.5" />
                    },
                    {
                      value: 'OUTSIDE',
                      label: 'Outside',
                      icon: <AlignRight className="size-3.5" />
                    }
                  ]}
                />
              </div>
            </div>
          </div>
        ))}

        {strokes.length > 0 && 'strokeCap' in node && (
          <div className="pt-2 border-t border-border mt-2 space-y-3">
            <div data-property="stroke-cap">
              <div className="text-[10px] text-muted mb-1">Cap</div>
              <div className="flex flex-wrap gap-1">
                {capOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    aria-label={option.label}
                    aria-pressed={capValue === option.value}
                    className={`rounded px-1.5 py-1 text-[10px] ${
                      capValue === option.value
                        ? 'bg-active text-surface'
                        : 'bg-input/50 text-muted hover:bg-hover hover:text-surface'
                    }`}
                    onClick={() => setCap(option.value as StrokeCap)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
            <div data-property="stroke-join">
              <div className="text-[10px] text-muted mb-1">Join</div>
              <div className="flex flex-wrap gap-1">
                {strokeCtx.joinOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    aria-label={option.label}
                    aria-pressed={joinValue === option.value}
                    className={`rounded px-1.5 py-1 text-[10px] ${
                      joinValue === option.value
                        ? 'bg-active text-surface'
                        : 'bg-input/50 text-muted hover:bg-hover hover:text-surface'
                    }`}
                    onClick={() => setJoin(option.value as StrokeJoin)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex-1">
                <div className="text-[10px] text-muted mb-1">{panels.strokeMiterLimit}</div>
                <NumberField
                  ariaLabel={panels.strokeMiterLimit}
                  dataProperty="stroke-miter-limit"
                  value={strokeCtx.miterLimit}
                  min={1}
                  onChange={(v) => strokeCtx.updateMiterLimit(v)}
                  onCommit={(v) => strokeCtx.commitMiterLimit(v)}
                />
              </div>
              <IconButton
                label={panels.strokeSides}
                onClick={() => strokeCtx.selectSide(sidesExpanded ? 'ALL' : 'CUSTOM', node)}
                className={sidesExpanded ? 'opacity-100' : ''}
                data-property="stroke-sides"
              >
                <span className="text-[10px] font-semibold">TRBL</span>
              </IconButton>
            </div>

            {sidesExpanded && (
              <div className="grid grid-cols-4 gap-1.5">
                {strokeCtx.borderSides.map((side) => (
                  <label key={side} className="flex flex-col gap-1">
                    <span className="text-[10px] text-muted capitalize">{side}</span>
                    <NumberField
                      ariaLabel={side}
                      min={0}
                      value={strokeCtx.borderWeight(node, side)}
                      onChange={(v) => strokeCtx.updateBorderWeight(side, v, node)}
                      onCommit={(v) => strokeCtx.updateBorderWeight(side, v, node)}
                    />
                  </label>
                ))}
              </div>
            )}

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
                  const dashes = val
                    .split(/[, ]+/)
                    .map(Number)
                    .filter((n) => !isNaN(n))
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
