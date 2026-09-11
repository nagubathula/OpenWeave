import React from 'react'

import { useI18n, useEditor, useSelectionState } from '@openweave/react'
import type { MaskType } from '@openweave/scene-graph'

import { AppSwitch } from '@/components/ui/AppSwitch'
import PanelSection from '@/components/ui/panel/PanelSection'

const inputClass =
  'w-full bg-input/50 rounded px-2 py-1 border border-border text-surface text-xs outline-none focus:border-accent'

export default function MaskSection() {
  const { panels } = useI18n()
  const editor = useEditor()
  const { selectedNode } = useSelectionState()

  const active = selectedNode?.isMask === true
  const maskType = selectedNode?.maskType ?? 'ALPHA'
  const maskIsOutline = selectedNode?.maskIsOutline === true

  const setMaskType = (value: MaskType) => {
    if (!selectedNode || !selectedNode.isMask || selectedNode.maskType === value) return
    editor.updateNodeWithUndo(selectedNode.id, { maskType: value }, 'Change mask type')
  }

  const toggleMaskIsOutline = (checked: boolean) => {
    if (!selectedNode || !selectedNode.isMask || selectedNode.maskIsOutline === checked) return
    editor.updateNodeWithUndo(selectedNode.id, { maskIsOutline: checked }, 'Toggle mask outline')
  }

  if (!active) return null

  return (
    <PanelSection label={panels.mask}>
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <div className="text-[10px] text-muted w-16">{panels.maskType}</div>
          <select
            className={inputClass + ' flex-1'}
            value={maskType}
            onChange={(e) => setMaskType(e.target.value as MaskType)}
          >
            <option value="ALPHA">{panels.maskTypeAlpha}</option>
            <option value="VECTOR">{panels.maskTypeVector}</option>
            <option value="LUMINANCE">{panels.maskTypeLuminance}</option>
          </select>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-muted">{panels.maskIsOutline}</span>
          <AppSwitch
            label={panels.maskIsOutline}
            value={maskIsOutline}
            onValueChange={toggleMaskIsOutline}
          />
        </div>
      </div>
    </PanelSection>
  )
}
