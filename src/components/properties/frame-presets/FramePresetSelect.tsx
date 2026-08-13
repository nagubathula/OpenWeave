import React from 'react'
import { useI18n, useSelectionState } from '@openweave/react'
import { getActiveEditorStore } from '@/app/editor/active-store'
import {
  findFrameResizePreset,
  FRAME_RESIZE_PRESET_CATEGORIES,
  FRAME_RESIZE_PRESETS
} from '@/app/editor/frame-presets'

import PanelSection from '@/components/ui/panel/PanelSection'

const inputClass = 'w-full bg-input/50 rounded px-2 py-1 border border-border text-surface text-xs outline-none focus:border-accent'

export default function FramePresetSelect() {
  const store = getActiveEditorStore()
  const { selectedNode } = useSelectionState()
  const { panels } = useI18n()

  if (selectedNode?.type !== 'FRAME') return null

  const preset = findFrameResizePreset(selectedNode.width, selectedNode.height, selectedNode.name)
  const presetId = preset?.id ?? 'custom'

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value
    if (id === 'custom') return
    const newPreset = FRAME_RESIZE_PRESETS.find((candidate) => candidate.id === id)
    if (newPreset) {
      store.resizeFrameToPreset(selectedNode.id, newPreset)
    }
  }

  return (
    <PanelSection label={panels.frame}>
      <div className="flex flex-col gap-1">
        <select
          className={inputClass}
          value={presetId}
          onChange={handleChange}
        >
          {presetId === 'custom' && (
            <option value="custom">{panels.framePresetCustom}</option>
          )}
          
          {FRAME_RESIZE_PRESET_CATEGORIES.map((category, i) => (
            <optgroup key={i} label={panels[category.labelKey] as string}>
              {category.presets.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>
    </PanelSection>
  )
}
