import React from 'react'
import { useEditor, useSelectionState } from '@openweave/react'
import type { ExportSetting } from '@openweave/scene-graph'
import { Plus, Minus } from 'lucide-react'

import PanelSection from '@/components/ui/panel/PanelSection'
import IconButton from '@/components/ui/IconButton'
import { getActiveEditorStore } from '@/app/editor/active-store'

const inputClass = 'w-full bg-input/50 rounded px-2 py-1 border border-border text-surface text-xs outline-none focus:border-accent'

export default function ExportSection() {
  const editor = useEditor()
  const { selectedNode: activeNode } = useSelectionState()
  
  // We show Export section even for nothing selected (Page settings), 
  // but for actual multiple selections maybe not. Let's keep it safe.
  
  const exportSettings = (activeNode && 'exportSettings' in activeNode ? (activeNode.exportSettings) : []) ?? []
  
  const addSetting = () => {
    if (activeNode) {
      editor.updateNodeWithUndo(activeNode.id, { exportSettings: [...exportSettings, { format: 'PNG', scale: 1 } as any] }, 'Add export setting')
    }
  }

  const updateSetting = (index: number, patch: Partial<ExportSetting>) => {
    if (activeNode) {
      editor.updateNodeWithUndo(activeNode.id, { exportSettings: exportSettings.map((e, i) => i === index ? { ...e, ...patch } : e) }, 'Update export setting')
    }
  }

  const removeSetting = (index: number) => {
    if (activeNode) {
      editor.updateNodeWithUndo(activeNode.id, { exportSettings: exportSettings.filter((_, i) => i !== index) }, 'Remove export setting')
    }
  }

  const exportSelection = (scale: number, format: 'png' | 'jpg' | 'webp' | 'svg' | 'pdf') =>
    getActiveEditorStore().exportSelection(scale, format)

  return (
    <PanelSection
      label="Export"
      actions={
        <IconButton label="Add export setting" onClick={addSetting}>
          <Plus className="size-3.5" />
        </IconButton>
      }
    >
      <div className="space-y-3">
        {exportSettings.map((setting: any, i: number) => (
          <div key={i} className="flex flex-col gap-2 relative group">
            <div className="flex items-center gap-1.5">
              <div className="w-16">
                <select
                  className={inputClass + ' h-6 px-1'}
                  value={setting.scale + 'x'}
                  onChange={(e) => {
                    const val = e.target.value
                    updateSetting(i, { scale: Number.parseFloat(val) } as any)
                  }}
                >
                  <option value="0.5x">0.5x</option>
                  <option value="1x">1x</option>
                  <option value="1.5x">1.5x</option>
                  <option value="2x">2x</option>
                  <option value="3x">3x</option>
                  <option value="4x">4x</option>
                  <option value="512w">512w</option>
                  <option value="512h">512h</option>
                </select>
              </div>
              
              <div className="flex-1">
                <input
                  type="text"
                  className={inputClass + ' h-6'}
                  placeholder="Suffix"
                  value={setting.suffix ?? ''}
                  onChange={(e) => updateSetting(i, { suffix: e.target.value } as any)}
                />
              </div>
              
              <div className="w-16">
                <select
                  className={inputClass + ' h-6 px-1'}
                  value={setting.format}
                  onChange={(e) => updateSetting(i, { format: e.target.value } as any)}
                >
                  <option value="PNG">PNG</option>
                  <option value="JPG">JPG</option>
                  <option value="SVG">SVG</option>
                  <option value="PDF">PDF</option>
                </select>
              </div>
              
              <IconButton label="Remove export setting" onClick={() => removeSetting(i)}>
                <Minus className="size-3.5" />
              </IconButton>
            </div>
          </div>
        ))}
        
        {exportSettings.length > 0 && (
          <button
            type="button"
            className="w-full rounded bg-accent px-3 py-1.5 text-center text-[11px] font-semibold text-accent-foreground hover:bg-accent/90"
            onClick={() => void exportSelection(exportSettings[0].scale ?? 1, (exportSettings[0].format ?? 'PNG').toLowerCase() as any)}
          >
            Export {activeNode?.name ? activeNode.name : 'Selection'}
          </button>
        )}
        
        {/* If no settings are configured, show a generic export button for 1x PNG */}
        {exportSettings.length === 0 && activeNode && (
          <button
            type="button"
            className="w-full rounded bg-input/50 border border-border px-3 py-1.5 text-center text-[11px] font-semibold text-surface hover:bg-input/70"
            onClick={() => void exportSelection(1, 'png')}
          >
            Export {activeNode.name}
          </button>
        )}
      </div>
    </PanelSection>
  )
}
