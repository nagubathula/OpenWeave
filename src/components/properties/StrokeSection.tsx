import React from 'react'
import { useEditor, useSelectionState } from '@openweave/react'
import { BLACK } from '@openweave/core/constants'
import { colorToHexRaw } from '@openweave/core/color'
import type { Stroke, SceneNode } from '@openweave/scene-graph'
import { Plus, Eye, EyeOff, Minus, AlignCenter, AlignLeft, AlignRight } from 'lucide-react'

import PanelSection from '@/components/ui/panel/PanelSection'
import IconButton from '@/components/ui/IconButton'
import ColorSwatchPopover from '@/components/color-picker/ColorSwatchPopover'
import NumberField from '@/components/inputs/NumberField'
import SegmentedControl from '@/components/ui/SegmentedControl'

const inputClass = 'w-full bg-input/50 rounded px-2 py-1 border border-border text-surface text-xs outline-none focus:border-accent'

export default function StrokeSection() {
  const editor = useEditor()
  const { selectedNode: node } = useSelectionState()
  
  if (!node) return null

  const strokes = ('strokes' in node ? (node.strokes) : undefined) ?? []
  
  // Some node types might have root-level stroke properties, but generally they are inside Stroke
  const strokeCap = 'strokeCap' in node ? node.strokeCap ?? 'NONE' : 'NONE'
  const strokeJoin = 'strokeJoin' in node ? node.strokeJoin ?? 'MITER' : 'MITER'
  const dashPattern = 'dashPattern' in node ? node.dashPattern ?? [] : []

  const updateNode = (patch: Partial<SceneNode>, label: string) => {
    editor.updateNodeWithUndo(node.id, patch, label)
  }

  const updateStrokes = (next: Stroke[]) => {
    updateNode({ strokes: next }, 'Change stroke')
  }

  const addStroke = () => {
    updateStrokes([...strokes, { color: BLACK, weight: 1, opacity: 1, visible: true, align: 'CENTER' }])
  }

  const updateStroke = (index: number, patch: Partial<Stroke>) => {
    updateStrokes(strokes.map((s, i) => (i === index ? { ...s, ...patch } : s)))
  }

  const removeStroke = (index: number) => {
    updateStrokes(strokes.filter((_, i) => i !== index))
  }

  return (
    <PanelSection
      label="Stroke"
      actions={
        <IconButton label="Add stroke" onClick={addStroke}>
          <Plus className="size-3.5" />
        </IconButton>
      }
    >
      <div className="space-y-3">
        {strokes.map((stroke, i) => (
          <div key={i} className="flex flex-col gap-2 relative group pb-2 border-b border-border/50 last:border-0 last:pb-0">
            <div className="flex items-center gap-1.5">
              <div className="flex-1 flex items-center gap-1 bg-input/50 rounded px-1.5 py-1 border border-border focus-within:border-accent transition-colors">
                <ColorSwatchPopover
                  color={stroke.color}
                  onChange={(c) => updateStroke(i, { color: c })}
                />
                <input
                  type="text"
                  className="w-14 bg-transparent outline-none text-xs text-surface font-mono uppercase"
                  value={colorToHexRaw(stroke.color)}
                  onChange={() => {}} // Let popover handle actual color changes
                  readOnly
                />
                <div className="w-[1px] h-3 bg-border mx-1"></div>
                <div className="w-14">
                  <NumberField
                    value={Math.round((stroke.opacity ?? 1) * 100)}
                    min={0}
                    max={100}
                    suffix="%"
                    onChange={(v) => updateStroke(i, { opacity: v / 100 })}
                    onCommit={(v) => updateStroke(i, { opacity: v / 100 })}
                  />
                </div>
              </div>
              <IconButton
                label={stroke.visible ? 'Hide stroke' : 'Show stroke'}
                onClick={() => updateStroke(i, { visible: ! stroke.visible ? true : false })}
                className={!stroke.visible ? 'opacity-50' : ''}
              >
                {stroke.visible ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
              </IconButton>
              <IconButton label="Remove stroke" onClick={() => removeStroke(i)}>
                <Minus className="size-3.5" />
              </IconButton>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <div className="text-[10px] text-muted mb-1">Weight</div>
                <NumberField
                  value={stroke.weight ?? 1}
                  min={0}
                  onChange={(v) => updateStroke(i, { weight: Math.max(0, v) })}
                  onCommit={(v) => updateStroke(i, { weight: Math.max(0, v) })}
                />
              </div>
              <div className="flex-[2]">
                <div className="text-[10px] text-muted mb-1">Position</div>
                <SegmentedControl
                  value={stroke.align ?? 'CENTER'}
                  onChange={(v) => updateStroke(i, { align: v as any })}
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
                  value={strokeCap}
                  onChange={(e) => updateNode({ strokeCap: e.target.value as any }, 'Change stroke cap')}
                >
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
                  value={strokeJoin}
                  onChange={(e) => updateNode({ strokeJoin: e.target.value as any }, 'Change stroke join')}
                >
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
                onChange={(e) => {
                  const val = e.target.value
                  const dashes = val.split(/[, ]+/).map(Number).filter(n => !isNaN(n))
                  updateNode({ dashPattern: dashes }, 'Change dash pattern')
                }}
              />
            </div>
          </div>
        )}
      </div>
    </PanelSection>
  )
}
