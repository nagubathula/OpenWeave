import React from 'react'
import { useEditor, useSelectionState } from '@openweave/react'
import { colorToHexRaw } from '@openweave/core/color'
import type { Effect } from '@openweave/scene-graph'
import { Plus, Eye, EyeOff, Minus, Settings2 } from 'lucide-react'

import PanelSection from '@/components/ui/panel/PanelSection'
import IconButton from '@/components/ui/IconButton'
import ColorSwatchPopover from '@/components/color-picker/ColorSwatchPopover'
import NumberField from '@/components/inputs/NumberField'
import * as Popover from '@radix-ui/react-popover'

const inputClass = 'w-full bg-input/50 rounded px-2 py-1 border border-border text-surface text-xs outline-none focus:border-accent'

export default function EffectsSection() {
  const editor = useEditor()
  const { selectedNode: node } = useSelectionState()
  
  if (!node) return null

  const effects = ('effects' in node ? (node.effects as Effect[]) : undefined) ?? []

  const updateEffects = (next: Effect[]) => {
    editor.updateNodeWithUndo(node.id, { effects: next }, 'Change effect')
  }

  const addEffect = () => {
    updateEffects([...effects, { type: 'DROP_SHADOW', color: { r: 0, g: 0, b: 0, a: 0.25 }, offset: { x: 0, y: 4 }, radius: 4, spread: 0, visible: true, blendMode: 'NORMAL' } as any])
  }

  const updateEffect = (index: number, patch: Partial<Effect>) => {
    updateEffects(effects.map((e, i) => (i === index ? { ...e, ...patch } as any : e)))
  }

  const removeEffect = (index: number) => {
    updateEffects(effects.filter((_, i) => i !== index))
  }

  return (
    <PanelSection
      label="Effects"
      actions={
        <IconButton label="Add effect" onClick={addEffect}>
          <Plus className="size-3.5" />
        </IconButton>
      }
    >
      <div className="space-y-3">
        {effects.map((effect: any, i) => (
          <div key={i} className="flex flex-col gap-2 relative group">
            <div className="flex items-center gap-1.5">
              <div className="flex-1 flex items-center gap-1 bg-input/50 rounded px-1.5 py-1 border border-border focus-within:border-accent transition-colors">
                <select
                  className="w-full bg-transparent outline-none text-xs text-surface truncate"
                  value={effect.type}
                  onChange={(e) => updateEffect(i, { type: e.target.value as any })}
                >
                  <option value="DROP_SHADOW">Drop shadow</option>
                  <option value="INNER_SHADOW">Inner shadow</option>
                  <option value="LAYER_BLUR">Layer blur</option>
                  <option value="BACKGROUND_BLUR">Background blur</option>
                </select>
              </div>

              <Popover.Root>
                <Popover.Trigger asChild>
                  <button className="flex items-center justify-center size-6 rounded hover:bg-input/50 text-muted hover:text-surface transition-colors">
                    <Settings2 className="size-3.5" />
                  </button>
                </Popover.Trigger>
                <Popover.Portal>
                  <Popover.Content side="left" align="start" sideOffset={10} className="w-56 rounded border border-border bg-panel p-3 shadow-lg z-50">
                    <div className="space-y-3">
                      <div className="text-xs font-semibold">{effect.type.replace('_', ' ')}</div>
                      
                      {effect.type.includes('SHADOW') && (
                        <>
                          <div className="flex gap-2">
                            <div className="flex-1">
                              <div className="text-[10px] text-muted mb-1">X</div>
                              <NumberField
                                value={effect.offset?.x ?? 0}
                                onChange={(v) => updateEffect(i, { offset: { ...(effect.offset ?? { y: 0 }), x: v } })}
                                onCommit={(v) => updateEffect(i, { offset: { ...(effect.offset ?? { y: 0 }), x: v } })}
                              />
                            </div>
                            <div className="flex-1">
                              <div className="text-[10px] text-muted mb-1">Y</div>
                              <NumberField
                                value={effect.offset?.y ?? 0}
                                onChange={(v) => updateEffect(i, { offset: { ...(effect.offset ?? { x: 0 }), y: v } })}
                                onCommit={(v) => updateEffect(i, { offset: { ...(effect.offset ?? { x: 0 }), y: v } })}
                              />
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <div className="flex-1">
                              <div className="text-[10px] text-muted mb-1">Blur</div>
                              <NumberField
                                value={effect.radius ?? 0}
                                onChange={(v) => updateEffect(i, { radius: Math.max(0, v) })}
                                onCommit={(v) => updateEffect(i, { radius: Math.max(0, v) })}
                              />
                            </div>
                            <div className="flex-1">
                              <div className="text-[10px] text-muted mb-1">Spread</div>
                              <NumberField
                                value={effect.spread ?? 0}
                                onChange={(v) => updateEffect(i, { spread: v })}
                                onCommit={(v) => updateEffect(i, { spread: v })}
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
                                onChange={(v) => updateEffect(i, { color: { ...(effect.color ?? { r: 0, g: 0, b: 0 }), a: v / 100 } })}
                                onCommit={(v) => updateEffect(i, { color: { ...(effect.color ?? { r: 0, g: 0, b: 0 }), a: v / 100 } })}
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
                            onCommit={(v) => updateEffect(i, { radius: Math.max(0, v) })}
                          />
                        </div>
                      )}

                      <div>
                        <div className="text-[10px] text-muted mb-1">Blend mode</div>
                        <select
                          className={inputClass + ' h-6 w-full'}
                          value={effect.blendMode ?? 'NORMAL'}
                          onChange={(e) => updateEffect(i, { blendMode: e.target.value as any })}
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
                    </div>
                  </Popover.Content>
                </Popover.Portal>
              </Popover.Root>

              <IconButton
                label={effect.visible !== false ? 'Hide effect' : 'Show effect'}
                onClick={() => updateEffect(i, { visible: effect.visible === false ? true : false })}
                className={effect.visible === false ? 'opacity-50' : ''}
              >
                {effect.visible !== false ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
              </IconButton>
              <IconButton label="Remove effect" onClick={() => removeEffect(i)}>
                <Minus className="size-3.5" />
              </IconButton>
            </div>
          </div>
        ))}
      </div>
    </PanelSection>
  )
}
