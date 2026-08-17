import React, { useMemo } from 'react'
import { useI18n, useSelectionState } from '@openweave/react'
import { getActiveEditorStore } from '@/app/editor/active-store'
import { findFrameResizePreset, FRAME_RESIZE_PRESETS } from '@/app/editor/frame-presets'

import PanelSection from '@/components/ui/panel/PanelSection'
import { AppSelect } from '@/components/ui/AppSelect'

export default function FramePresetSelect() {
  const store = getActiveEditorStore()
  const { selectedNode } = useSelectionState()
  const { panels } = useI18n()

  const options = useMemo(
    () => [
      { value: 'custom', label: panels.framePresetCustom },
      ...FRAME_RESIZE_PRESETS.map((p) => ({ value: p.id, label: p.name }))
    ],
    [panels]
  )

  if (selectedNode?.type !== 'FRAME') return null

  const preset = findFrameResizePreset(selectedNode.width, selectedNode.height, selectedNode.name)
  const presetId = preset?.id ?? 'custom'

  const handleChange = (id: string) => {
    if (id === 'custom') return
    const newPreset = FRAME_RESIZE_PRESETS.find((candidate) => candidate.id === id)
    if (newPreset) {
      store.resizeFrameToPreset(selectedNode.id, newPreset)
    }
  }

  return (
    <PanelSection label={panels.frame}>
      <div className="flex flex-col gap-1">
        <AppSelect
          label={panels.framePreset}
          options={options}
          value={presetId}
          onValueChange={handleChange}
        />
      </div>
    </PanelSection>
  )
}
