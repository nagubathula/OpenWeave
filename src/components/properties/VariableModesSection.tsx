import React from 'react'

import { useEditor, useI18n, useSceneComputed, useSelectionState } from '@openweave/react'

import { AppSelect } from '@/components/ui/AppSelect'
import PanelSection from '@/components/ui/panel/PanelSection'

const AUTO_VALUE = '__auto__'

interface ModeRow {
  collectionId: string
  name: string
  value: string
  options: { value: string; label: string }[]
}

/**
 * Figma-style per-frame variable mode overrides: one select per collection
 * with more than one mode. "Auto" inherits from ancestors (falling back to
 * the collection's active mode); picking a mode pins this subtree to it and
 * re-resolves every bound value inside.
 */
export default function VariableModesSection() {
  const editor = useEditor()
  const { selectedNode: node } = useSelectionState()
  const { panels } = useI18n()

  const rows = useSceneComputed<ModeRow[]>(() => {
    void editor.state.sceneVersion
    if (!node) return []
    return editor
      .getCollections()
      .filter((collection) => collection.modes.length > 1)
      .map((collection) => ({
        collectionId: collection.id,
        name: collection.name,
        value: node.variableModes[collection.id] ?? AUTO_VALUE,
        options: [
          { value: AUTO_VALUE, label: panels.modeAuto },
          ...collection.modes.map((mode) => ({ value: mode.modeId, label: mode.name }))
        ]
      }))
  })

  if (!node || rows.length === 0) return null

  return (
    <PanelSection label={panels.variableModes}>
      <div className="space-y-2" data-test-id="variable-modes-section">
        {rows.map((row) => (
          <div key={row.collectionId} className="flex flex-col gap-1 text-xs">
            <span className="truncate text-[10px] text-muted">{row.name}</span>
            <AppSelect
              label={row.name}
              options={row.options}
              value={row.value}
              onValueChange={(value) =>
                editor.setNodeVariableMode(
                  node.id,
                  row.collectionId,
                  value === AUTO_VALUE ? null : value
                )
              }
            />
          </div>
        ))}
      </div>
    </PanelSection>
  )
}
