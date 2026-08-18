import { Plus, Minus } from 'lucide-react'
import React, { useState } from 'react'

import { useExport } from '@openweave/react'
import type { ExportFormatId } from '@openweave/scene-graph'

import type { ExportTargetRequest } from '@/app/document/export/create'
import { getActiveEditorStore } from '@/app/editor/active-store'
import { AppSelect } from '@/components/ui/AppSelect'
import IconButton from '@/components/ui/IconButton'
import PanelSection from '@/components/ui/panel/PanelSection'

const inputClass =
  'w-full bg-input/50 rounded px-2 py-1 border border-border text-surface text-xs outline-none focus:border-accent'

/**
 * Export section of the Design panel, ported from
 * src/components/properties/ExportSection.vue: per-target export rows
 * (selection when present, otherwise the current page), and an export that
 * renders every row for every target (multiple files bundle into a zip).
 */
export default function ExportSection() {
  const {
    scales,
    formats,
    formatSupportsScale,
    activeTarget,
    targetIds,
    activeName,
    activeSettings,
    mixed,
    addSetting,
    removeSetting,
    updateScale,
    updateFormat
  } = useExport()
  const [exporting, setExporting] = useState(false)

  async function doExport() {
    const editorStore = getActiveEditorStore()
    setExporting(true)
    try {
      const requests: ExportTargetRequest[] = []
      // Export exactly the rows shown in the panel (activeSettings) for every
      // target, so a multi-selection exports what the user sees rather than
      // each node's own (possibly divergent) settings.
      for (const id of targetIds) {
        if (!editorStore.graph.getNode(id)) continue
        const target =
          activeTarget === 'page'
            ? ({ scope: 'page', pageId: id } as const)
            : ({ scope: 'node', nodeId: id } as const)
        for (const setting of activeSettings) {
          requests.push({ target, formatId: setting.format, options: { scale: setting.scale } })
        }
      }
      await editorStore.exportTargets(requests)
    } finally {
      setExporting(false)
    }
  }

  return (
    <PanelSection
      label="Export"
      empty={!mixed && activeSettings.length === 0}
      data-test-id="export-section"
      actions={
        <IconButton label="Add export setting" onClick={addSetting}>
          <Plus className="size-3.5" />
        </IconButton>
      }
    >
      <div className="space-y-3" data-property="exportSettings">
        {mixed && (
          <p className="text-[10px] text-muted">
            Selection has mixed export settings — editing applies the rows below to all.
          </p>
        )}

        {activeSettings.map((setting, i) => (
          <div
            key={i}
            data-property="exportSettings"
            data-index={i}
            className="group relative flex items-center gap-1.5"
          >
            {formatSupportsScale(setting.format) ? (
              <div className="w-20">
                <select
                  data-test-id="export-scale"
                  aria-label="Export scale"
                  className={inputClass + ' h-6 px-1'}
                  value={String(setting.scale)}
                  onChange={(e) => updateScale(i, Number.parseFloat(e.target.value))}
                >
                  {scales.map((scale) => (
                    <option key={scale} value={String(scale)}>
                      {scale}x
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="w-20 text-[10px] text-muted">1x</div>
            )}

            <div className="flex-1">
              <AppSelect
                label="Export format"
                options={formats.map((format) => ({ value: format, label: format.toUpperCase() }))}
                value={setting.format}
                onValueChange={(value) => updateFormat(i, value as ExportFormatId)}
              />
            </div>

            <IconButton label="Remove export setting" onClick={() => removeSetting(i)}>
              <Minus className="size-3.5" />
            </IconButton>
          </div>
        ))}

        {activeSettings.length > 0 && (
          <button
            type="button"
            data-test-id="export-button"
            disabled={exporting}
            className="w-full rounded bg-accent px-3 py-1.5 text-center text-[11px] font-semibold text-accent-foreground hover:bg-accent/90 disabled:opacity-60"
            onClick={() => void doExport()}
          >
            {exporting ? 'Exporting…' : `Export ${activeName}`}
          </button>
        )}
      </div>
    </PanelSection>
  )
}
