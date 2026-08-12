import React from 'react'
import {
  useEditor,
  useSelectionState,
  useAppearance,
  usePosition,
  useI18n
} from '@openweave/react'
import { BLACK } from '@openweave/core/constants'
import { getActiveEditorStore } from '@/app/editor/active-store'
import LayoutSection from '@/components/properties/LayoutSection'
import ConstraintsSection from '@/components/properties/ConstraintsSection'
import TypographySection from '@/components/properties/TypographySection'
import FramePresetsSection from '@/components/properties/FramePresetsSection'
import ComponentPropertiesSection from '@/components/properties/ComponentPropertiesSection'
import { FillRow } from '@/components/properties/FillEditor'
import ColorSwatchPopover from '@/components/color-picker/ColorSwatchPopover'
import { Layers3 } from 'lucide-react'
import type { Fill, Stroke, Effect, ExportSetting } from '@openweave/scene-graph'
import type { Color } from '@openweave/scene-graph/primitives'

export function DesignPanel() {
  const { selectedNode: node, selectedCount: multiCount } = useSelectionState()
  const { panels } = useI18n()

  if (multiCount > 1) {
    return (
      <div data-test-id="design-panel-multi" className="scrollbar-thin flex-1 overflow-x-hidden overflow-y-auto p-3 space-y-4">
        <div className="flex items-center gap-2 border-b border-border pb-2">
          <Layers3 className="size-4 text-muted" />
          <span className="text-xs font-semibold text-surface">
            {panels.layersCount({ count: String(multiCount) })}
          </span>
        </div>
        <AppearanceSectionReact />
        <FillSectionReact />
        <StrokeSectionReact />
        <EffectsSectionReact />
        <ExportSectionReact />
      </div>
    )
  }

  if (node) {
    return (
      <div data-test-id="design-panel-single" className="scrollbar-thin flex-1 overflow-x-hidden overflow-y-auto p-3 space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-2">
          <span className="text-xs font-semibold text-surface truncate">{node.name}</span>
          <span className="text-[10px] uppercase tracking-wider text-muted">{node.type}</span>
        </div>

        <PositionSectionReact />
        <FramePresetsSection />
        <LayoutSection />
        <ConstraintsSection />
        <ComponentPropertiesSection />
        {node.type === 'TEXT' && <TypographySection />}
        <AppearanceSectionReact />
        <FillSectionReact />
        <StrokeSectionReact />
        <EffectsSectionReact />
        <ExportSectionReact />
      </div>
    )
  }

  return (
    <div data-test-id="design-panel-empty" className="scrollbar-thin flex-1 overflow-x-hidden overflow-y-auto p-3 space-y-4">
      <div className="text-xs text-muted p-2">Page settings</div>
      <ExportSectionReact />
    </div>
  )
}

function PositionSectionReact() {
  const { x, y, width, height, updateProp } = usePosition()
  return (
    <div className="space-y-2 border-b border-border pb-3">
      <div className="text-[11px] font-semibold text-muted uppercase tracking-wider">Position & Size</div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="flex items-center gap-1.5 bg-input/50 rounded px-2 py-1 border border-border">
          <span className="text-muted text-[10px]">X</span>
          <input
            type="number"
            className="w-full bg-transparent outline-none text-surface"
            value={Math.round(typeof x === 'number' ? x : 0)}
            onChange={(e) => updateProp('x', Number(e.target.value))}
          />
        </div>
        <div className="flex items-center gap-1.5 bg-input/50 rounded px-2 py-1 border border-border">
          <span className="text-muted text-[10px]">Y</span>
          <input
            type="number"
            className="w-full bg-transparent outline-none text-surface"
            value={Math.round(typeof y === 'number' ? y : 0)}
            onChange={(e) => updateProp('y', Number(e.target.value))}
          />
        </div>
        <div className="flex items-center gap-1.5 bg-input/50 rounded px-2 py-1 border border-border">
          <span className="text-muted text-[10px]">W</span>
          <input
            type="number"
            className="w-full bg-transparent outline-none text-surface"
            value={Math.round(typeof width === 'number' ? width : 0)}
            onChange={(e) => updateProp('width', Number(e.target.value))}
          />
        </div>
        <div className="flex items-center gap-1.5 bg-input/50 rounded px-2 py-1 border border-border">
          <span className="text-muted text-[10px]">H</span>
          <input
            type="number"
            className="w-full bg-transparent outline-none text-surface"
            value={Math.round(typeof height === 'number' ? height : 0)}
            onChange={(e) => updateProp('height', Number(e.target.value))}
          />
        </div>
      </div>
    </div>
  )
}

function AppearanceSectionReact() {
  const { opacityPercent, updateProp } = useAppearance()
  return (
    <div className="space-y-2 border-b border-border pb-3">
      <div className="text-[11px] font-semibold text-muted uppercase tracking-wider">Appearance</div>
      <div className="flex items-center gap-2 text-xs">
        <span className="text-muted text-[11px]">Opacity</span>
        <div className="flex-1 flex items-center gap-1 bg-input/50 rounded px-2 py-1 border border-border">
          <input
            type="number"
            min={0}
            max={100}
            className="w-full bg-transparent outline-none text-surface"
            value={Math.round(typeof opacityPercent === 'number' ? opacityPercent : 100)}
            onChange={(e) => updateProp('opacity', Number(e.target.value) / 100)}
          />
          <span className="text-muted text-[10px]">%</span>
        </div>
      </div>
    </div>
  )
}

function FillSectionReact() {
  const editor = useEditor()
  const { selectedNode: node } = useSelectionState()
  const fills = (node && 'fills' in node ? (node.fills as Fill[]) : undefined) ?? []
  const commit = (next: Fill[]) => {
    if (node) editor.updateNodeWithUndo(node.id, { fills: next }, 'Change fill')
  }
  const addFill = () => {
    commit([...fills, { type: 'SOLID', color: BLACK, opacity: 1, visible: true }])
  }
  return (
    <div className="space-y-2 border-b border-border pb-3">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold text-muted uppercase tracking-wider">Fill</span>
        <button className="text-xs text-muted hover:text-surface" onClick={addFill}>+</button>
      </div>
      {fills.map((fill, i) => (
        <FillRow
          key={i}
          fill={fill}
          onChange={(next) => commit(fills.map((f, j) => (j === i ? next : f)))}
          onRemove={() => commit(fills.filter((_, j) => j !== i))}
        />
      ))}
    </div>
  )
}

function StrokeSectionReact() {
  const editor = useEditor()
  const { selectedNode: activeNode } = useSelectionState()
  const strokes = (activeNode && 'strokes' in activeNode ? (activeNode.strokes as Stroke[]) : []) ?? []
  const addStroke = () => {
    if (activeNode) {
      const current = (activeNode.strokes as Stroke[]) ?? []
      editor.updateNodeWithUndo(activeNode.id, { strokes: [...current, { color: BLACK, opacity: 1, visible: true, weight: 1, align: 'CENTER' }] }, 'Add stroke')
    }
  }
  const updateStrokeColor = (index: number, color: Color) => {
    if (!activeNode) return
    const next = strokes.map((s, i) => (i === index ? { ...s, color } : s))
    editor.updateNodeWithUndo(activeNode.id, { strokes: next }, 'Change stroke')
  }
  return (
    <div className="space-y-2 border-b border-border pb-3">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold text-muted uppercase tracking-wider">Stroke</span>
        <button className="text-xs text-muted hover:text-surface" onClick={addStroke}>+</button>
      </div>
      {strokes.map((stroke, i) => (
        <div key={i} className="flex items-center gap-2 text-xs bg-input/30 rounded p-1.5 border border-border">
          <ColorSwatchPopover color={stroke.color} onChange={(c) => updateStrokeColor(i, c)} />
        </div>
      ))}
    </div>
  )
}

function EffectsSectionReact() {
  const editor = useEditor()
  const { selectedNode: activeNode } = useSelectionState()
  const effects = (activeNode && 'effects' in activeNode ? (activeNode.effects as Effect[]) : []) ?? []
  const addEffect = () => {
    if (activeNode) {
      const current = (activeNode.effects as Effect[]) ?? []
      editor.updateNodeWithUndo(activeNode.id, { effects: [...current, { type: 'DROP_SHADOW', color: { r: 0, g: 0, b: 0, a: 0.25 }, offset: { x: 0, y: 4 }, radius: 4, spread: 0, visible: true }] }, 'Add effect')
    }
  }
  return (
    <div className="space-y-2 border-b border-border pb-3">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold text-muted uppercase tracking-wider">Effects</span>
        <button className="text-xs text-muted hover:text-surface" onClick={addEffect}>+</button>
      </div>
      {effects.map((effect, i) => (
        <div key={i} className="flex items-center gap-2 text-xs bg-input/30 rounded p-1.5 border border-border">
          <span className="flex-1 text-[11px] truncate">{effect.type}</span>
        </div>
      ))}
    </div>
  )
}

function ExportSectionReact() {
  const editor = useEditor()
  const { selectedNode: activeNode } = useSelectionState()
  const exportSelection = (scale: number, format: 'png' | 'jpg' | 'webp' | 'svg' | 'pdf') =>
    getActiveEditorStore().exportSelection(scale, format)
  const exportSettings = (activeNode && 'exportSettings' in activeNode ? (activeNode.exportSettings as ExportSetting[]) : []) ?? []
  const addSetting = () => {
    if (activeNode) {
      const current = (activeNode.exportSettings as ExportSetting[]) ?? []
      editor.updateNodeWithUndo(activeNode.id, { exportSettings: [...current, { format: 'png', suffix: '', scale: 1 } as unknown as ExportSetting] }, 'Add export setting')
    }
  }
  return (
    <div className="space-y-2 border-b border-border pb-3">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold text-muted uppercase tracking-wider">Export</span>
        <button className="text-xs text-muted hover:text-surface" onClick={addSetting}>+</button>
      </div>
      {(exportSettings ?? []).map((setting: ExportSetting, i: number) => (
        <div key={i} className="flex items-center justify-between text-xs bg-input/30 rounded p-1.5 border border-border">
          <span className="text-[11px] font-mono">{setting.format}</span>
          <span className="text-[10px] text-muted">{setting.format}</span>
        </div>
      ))}
      <button
        type="button"
        className="w-full rounded bg-accent px-3 py-1 text-center text-xs font-semibold text-accent-foreground hover:bg-accent/90"
        onClick={() => void exportSelection(1, 'png')}
      >
        Export Selection
      </button>
    </div>
  )
}

export default DesignPanel
