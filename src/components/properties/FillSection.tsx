import React from 'react'
import { useEditor, useSelectionState } from '@openweave/react'
import { BLACK } from '@openweave/core/constants'
import { colorToHexRaw } from '@openweave/core/color'
import type { Fill } from '@openweave/scene-graph'
import { Plus, Eye, EyeOff, Minus } from 'lucide-react'

import PanelSection from '@/components/ui/panel/PanelSection'
import IconButton from '@/components/ui/IconButton'
import ColorSwatchPopover from '@/components/color-picker/ColorSwatchPopover'
import NumberField from '@/components/inputs/NumberField'
import { FillRow as ComplexFillEditor } from '@/components/properties/FillEditor'

const inputClass = 'w-full bg-input/50 rounded px-2 py-1 border border-border text-surface text-xs outline-none focus:border-accent'

export default function FillSection() {
  const editor = useEditor()
  const { selectedNode: node } = useSelectionState()
  const fills = (node && 'fills' in node ? (node.fills as Fill[]) : undefined) ?? []

  const commit = (next: Fill[]) => {
    if (node) editor.updateNodeWithUndo(node.id, { fills: next }, 'Change fill')
  }

  const addFill = () => {
    commit([...fills, { type: 'SOLID', color: BLACK, opacity: 1, visible: true }])
  }

  const updateFill = (index: number, patch: Partial<Fill>) => {
    commit(fills.map((f, i) => (i === index ? { ...f, ...patch } : f)))
  }

  const removeFill = (index: number) => {
    commit(fills.filter((_, i) => i !== index))
  }

  return (
    <PanelSection
      label="Fill"
      actions={
        <IconButton label="Add fill" onClick={addFill}>
          <Plus className="size-3.5" />
        </IconButton>
      }
    >
      <div className="space-y-3">
        {fills.map((fill, i) => (
          <div key={i} className="flex flex-col gap-2 relative group">
            <div className="flex items-center gap-1.5">
              <div className="flex-1 flex items-center gap-1 bg-input/50 rounded px-1.5 py-1 border border-border focus-within:border-accent transition-colors">
                {fill.type === 'SOLID' ? (
                  <>
                    <ColorSwatchPopover
                      color={fill.color}
                      onChange={(c) => updateFill(i, { color: c })}
                    />
                    <input
                      type="text"
                      className="w-14 bg-transparent outline-none text-xs text-surface font-mono uppercase"
                      value={colorToHexRaw(fill.color)}
                      onChange={() => {}} // Let popover handle actual color changes for simplicity
                      readOnly
                    />
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
                    onChange={(v) => updateFill(i, { opacity: v / 100 })}
                    onCommit={(v) => updateFill(i, { opacity: v / 100 })}
                  />
                </div>
              </div>
              <IconButton
                label={fill.visible !== false ? 'Hide fill' : 'Show fill'}
                onClick={() => updateFill(i, { visible: fill.visible === false ? true : false })}
                className={fill.visible === false ? 'opacity-50' : ''}
              >
                {fill.visible !== false ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
              </IconButton>
              <IconButton label="Remove fill" onClick={() => removeFill(i)}>
                <Minus className="size-3.5" />
              </IconButton>
            </div>
            {/* Extended properties: Blend mode */}
            <div className="pl-1">
              <div className="text-[10px] text-muted mb-1">Blend mode</div>
              <select
                className={inputClass + ' h-6 w-full'}
                value={fill.blendMode ?? 'NORMAL'}
                onChange={(e) => updateFill(i, { blendMode: e.target.value as Fill['blendMode'] })}
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
                  onChange={(f) => updateFill(i, f)}
                  onRemove={() => removeFill(i)}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </PanelSection>
  )
}
