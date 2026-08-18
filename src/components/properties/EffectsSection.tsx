import * as Popover from '@radix-ui/react-popover'
import { Plus, Eye, EyeOff, Minus, Settings2 } from 'lucide-react'
import React from 'react'

import { colorToHexRaw } from '@openweave/core/color'
import { useEditorPropertyList, useI18n } from '@openweave/react'
import type { Effect } from '@openweave/scene-graph'

import ColorSwatchPopover from '@/components/color-picker/ColorSwatchPopover'
import NumberField from '@/components/inputs/NumberField'
import {
  commitDiscretePropertyListChange,
  useBlendModeOptions
} from '@/components/properties/blend-mode/use'
import SharedStyleField from '@/components/properties/shared-style/SharedStyleField'
import { AppSelect } from '@/components/ui/AppSelect'
import IconButton from '@/components/ui/IconButton'
import PanelSection from '@/components/ui/panel/PanelSection'

export default function EffectsSection() {
  const { items: effects, isMixed, active, flush, actions } = useEditorPropertyList('effects')
  const { panels } = useI18n()
  const blendOptions = useBlendModeOptions()

  if (!active) return null

  const addEffect = () => {
    // With a multi-selection this replaces every layer's effects (mixed included).
    actions.add({
      type: 'DROP_SHADOW',
      color: { r: 0, g: 0, b: 0, a: 0.25 },
      offset: { x: 0, y: 4 },
      radius: 4,
      spread: 0,
      visible: true,
      blendMode: 'NORMAL'
    })
  }

  const updateEffect = (index: number, patch: Partial<Effect>) => {
    actions.patch(index, patch)
  }

  const commitEffect = (index: number, patch: Partial<Effect>) => {
    commitDiscretePropertyListChange(flush, () => actions.patch(index, patch))
  }

  return (
    <PanelSection
      label="Effects"
      empty={!isMixed && effects.length === 0}
      actions={
        <IconButton label="Add effect" onClick={addEffect}>
          <Plus className="size-3.5" />
        </IconButton>
      }
    >
      <div className="space-y-3">
        <SharedStyleField kind="effect" label={panels.effectStyle} />

        {isMixed && <p className="text-[11px] text-muted">{panels.mixedEffectsHelp}</p>}

        {effects.map((effect, i) => (
          <div
            key={i}
            className="flex flex-col gap-2 relative group"
            data-property="effects"
            data-index={i}
          >
            <div className="flex items-center gap-1.5">
              <div className="flex-1 flex items-center gap-1 bg-input/50 rounded px-1.5 py-1 border border-border focus-within:border-accent transition-colors">
                <select
                  className="w-full bg-transparent outline-none text-xs text-surface truncate"
                  value={effect.type}
                  data-property="effect-type"
                  onChange={(e) =>
                    commitDiscretePropertyListChange(flush, () =>
                      actions.patch(i, { type: e.target.value as Effect['type'] })
                    )
                  }
                >
                  <option value="DROP_SHADOW">Drop shadow</option>
                  <option value="INNER_SHADOW">Inner shadow</option>
                  <option value="LAYER_BLUR">Layer blur</option>
                  <option value="BACKGROUND_BLUR">Background blur</option>
                </select>
              </div>

              <Popover.Root>
                <Popover.Trigger asChild>
                  <button
                    type="button"
                    data-property="effect-expand"
                    aria-label="Expand effect settings"
                    className="flex items-center justify-center size-6 rounded hover:bg-input/50 text-muted hover:text-surface transition-colors"
                  >
                    <Settings2 className="size-3.5" />
                  </button>
                </Popover.Trigger>
                <Popover.Portal>
                  <Popover.Content
                    data-slot="effect-settings"
                    side="left"
                    align="start"
                    sideOffset={10}
                    className="w-56 rounded border border-border bg-panel p-3 shadow-lg z-50"
                  >
                    <div className="space-y-3">
                      <div className="text-xs font-semibold">{effect.type.replace('_', ' ')}</div>

                      {effect.type.includes('SHADOW') && (
                        <>
                          <div className="flex gap-2">
                            <div className="flex-1">
                              <div className="text-[10px] text-muted mb-1">X</div>
                              <NumberField
                                value={effect.offset?.x ?? 0}
                                onChange={(v) =>
                                  updateEffect(i, {
                                    offset: { ...(effect.offset ?? { y: 0 }), x: v }
                                  })
                                }
                                onCommit={(v) =>
                                  commitEffect(i, {
                                    offset: { ...(effect.offset ?? { y: 0 }), x: v }
                                  })
                                }
                              />
                            </div>
                            <div className="flex-1">
                              <div className="text-[10px] text-muted mb-1">Y</div>
                              <NumberField
                                value={effect.offset?.y ?? 0}
                                onChange={(v) =>
                                  updateEffect(i, {
                                    offset: { ...(effect.offset ?? { x: 0 }), y: v }
                                  })
                                }
                                onCommit={(v) =>
                                  commitEffect(i, {
                                    offset: { ...(effect.offset ?? { x: 0 }), y: v }
                                  })
                                }
                              />
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <div className="flex-1">
                              <div className="text-[10px] text-muted mb-1">Blur</div>
                              <NumberField
                                value={effect.radius ?? 0}
                                onChange={(v) => updateEffect(i, { radius: Math.max(0, v) })}
                                onCommit={(v) => commitEffect(i, { radius: Math.max(0, v) })}
                              />
                            </div>
                            <div className="flex-1">
                              <div className="text-[10px] text-muted mb-1">Spread</div>
                              <NumberField
                                value={effect.spread ?? 0}
                                onChange={(v) => updateEffect(i, { spread: v })}
                                onCommit={(v) => commitEffect(i, { spread: v })}
                              />
                            </div>
                          </div>
                          <div>
                            <div className="text-[10px] text-muted mb-1">Color</div>
                            <div className="flex items-center gap-2 bg-input/50 rounded px-1.5 py-1 border border-border">
                              <ColorSwatchPopover
                                color={effect.color ?? { r: 0, g: 0, b: 0, a: 0.25 }}
                                onChange={(c) => updateEffect(i, { color: c })}
                              />
                              <input
                                type="text"
                                className="w-14 bg-transparent outline-none text-xs text-surface font-mono uppercase"
                                value={colorToHexRaw(effect.color ?? { r: 0, g: 0, b: 0, a: 1 })}
                                onChange={() => {}}
                                readOnly
                              />
                              <div className="w-[1px] h-3 bg-border mx-1"></div>
                              <NumberField
                                value={Math.round((effect.color?.a ?? 1) * 100)}
                                min={0}
                                max={100}
                                suffix="%"
                                onChange={(v) =>
                                  updateEffect(i, {
                                    color: { ...(effect.color ?? { r: 0, g: 0, b: 0 }), a: v / 100 }
                                  })
                                }
                                onCommit={(v) =>
                                  commitEffect(i, {
                                    color: { ...(effect.color ?? { r: 0, g: 0, b: 0 }), a: v / 100 }
                                  })
                                }
                              />
                            </div>
                          </div>
                        </>
                      )}

                      {effect.type.includes('BLUR') && (
                        <div>
                          <div className="text-[10px] text-muted mb-1">Blur</div>
                          <NumberField
                            value={effect.radius ?? 0}
                            onChange={(v) => updateEffect(i, { radius: Math.max(0, v) })}
                            onCommit={(v) => commitEffect(i, { radius: Math.max(0, v) })}
                          />
                        </div>
                      )}

                      <div data-property="effect-blend-mode">
                        <div className="text-[10px] text-muted mb-1">Blend mode</div>
                        <AppSelect
                          label={panels.blendMode}
                          options={blendOptions}
                          value={effect.blendMode ?? 'NORMAL'}
                          onValueChange={(value) =>
                            commitDiscretePropertyListChange(flush, () =>
                              actions.patch(i, { blendMode: value as Effect['blendMode'] })
                            )
                          }
                        />
                      </div>
                    </div>
                  </Popover.Content>
                </Popover.Portal>
              </Popover.Root>

              <IconButton
                label={effect.visible !== false ? 'Hide effect' : 'Show effect'}
                onClick={() => actions.toggleVisibility(i)}
                className={effect.visible === false ? 'opacity-50' : ''}
              >
                {effect.visible !== false ? (
                  <Eye className="size-3.5" />
                ) : (
                  <EyeOff className="size-3.5" />
                )}
              </IconButton>
              <IconButton label="Remove effect" onClick={() => actions.remove(i)}>
                <Minus className="size-3.5" />
              </IconButton>
            </div>
          </div>
        ))}
      </div>
    </PanelSection>
  )
}
