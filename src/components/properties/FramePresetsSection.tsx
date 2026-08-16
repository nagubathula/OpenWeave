import React from 'react'
import { useEditor, useI18n, useSelectionState } from '@openweave/react'
import {
  findFrameResizePreset,
  FRAME_RESIZE_PRESET_CATEGORIES,
  FRAME_RESIZE_PRESETS
} from '@/app/editor/frame-presets'

/**
 * Preset canvas-size picker for FRAME nodes. Selecting a preset resizes the
 * frame (and its layout-aware descendants) to that device/paper dimension.
 */
export default function FramePresetsSection() {
  const editor = useEditor()
  const { selectedNode: node } = useSelectionState()
  const { panels } = useI18n()

  if (node?.type !== 'FRAME') return null

  const current = findFrameResizePreset(node.width, node.height, node.name)

  const onSelect = (id: string) => {
    const preset = FRAME_RESIZE_PRESETS.find((p) => p.id === id)
    if (preset) editor.resizeFrameToPreset(node.id, preset)
  }

  return (
    <div className="space-y-2 border-b border-border pb-3" data-test-id="frame-presets-section">
      <div className="text-[11px] font-semibold text-muted uppercase tracking-wider">Frame</div>
      <div className="flex items-center gap-1.5 bg-input/50 rounded px-2 py-1 border border-border text-xs">
        <select
          className="w-full bg-transparent outline-none text-surface"
          data-property="frame-preset"
          value={current?.id ?? 'custom'}
          onChange={(e) => onSelect(e.target.value)}
        >
          <option value="custom">{panels.framePresetCustom}</option>
          {FRAME_RESIZE_PRESET_CATEGORIES.map((category) => (
            <optgroup key={category.id} label={panels[category.labelKey] as string}>
              {category.presets.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.name} ({preset.width} × {preset.height})
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>
    </div>
  )
}
