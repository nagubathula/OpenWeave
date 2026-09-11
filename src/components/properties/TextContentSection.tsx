import React, { useEffect, useState } from 'react'

import { useEditor, useI18n, useSceneComputed, useSelectionState } from '@openweave/react'
import { BindableValueRoot, useStringBindingProvider } from '@openweave/react'

import VariableBindingPicker from '@/components/properties/binding/VariableBindingPicker'
import { BindingPill } from '@/components/ui/binding'
import PanelSection from '@/components/ui/panel/PanelSection'

const inputClass =
  'w-full h-6 bg-input/50 rounded px-2 py-1 border border-border text-surface text-xs outline-none focus:border-accent'

/**
 * Figma-style "Content" section for TEXT nodes: an editable text-content field
 * with string-variable binding. Binding a variable replaces the node's text
 * with the resolved value (per-character styling is cleared, matching
 * variable-driven content); editing the variable's value pushes the new text
 * to every bound node. Detaching keeps the last resolved text.
 */
export default function TextContentSection() {
  const editor = useEditor()
  const { selectedNode: node } = useSelectionState()
  const { panels, dialogs } = useI18n()
  const text = useSceneComputed(() => {
    void editor.state.sceneVersion
    return node?.type === 'TEXT' ? node.text : null
  })

  // Binding writes the variable's resolved value into the node (the editor's
  // bindVariable applies it for every direct binding path).
  const provider = useStringBindingProvider()

  const [draft, setDraft] = useState<string | null>(null)

  // Drop any in-progress draft when the selection moves to another node.
  useEffect(() => {
    setDraft(null)
  }, [node?.id])

  if (!node || node.type !== 'TEXT' || text === null) return null

  const commit = (value: string) => {
    setDraft(null)
    if (value === node.text) return
    editor.updateNodeWithUndo(node.id, { text: value }, 'Change text content')
  }

  const targets = [{ nodeId: node.id, path: 'characters' }]

  return (
    <PanelSection label={panels.content}>
      <div className="flex items-center gap-1" data-test-id="text-content-section">
        <BindableValueRoot
          provider={provider}
          targets={targets}
          value={text}
          batchLabel="Change text content"
        >
          {(binding) => (
            <>
              <div className="flex min-w-0 flex-1 items-center">
                {binding.state === 'bound' && binding.variable ? (
                  <div className="flex h-6 min-w-0 flex-1 items-center rounded border border-border bg-input/50 px-1.5">
                    <BindingPill
                      className="min-w-0 flex-1"
                      label={binding.variable.name}
                      tooltip={
                        typeof binding.resolvedValue === 'string'
                          ? `${binding.variable.name} · ${binding.resolvedValue}`
                          : binding.variable.name
                      }
                    />
                  </div>
                ) : (
                  <input
                    type="text"
                    className={inputClass}
                    aria-label={panels.content}
                    data-test-id="text-content-input"
                    value={draft ?? text}
                    onChange={(e) => setDraft(e.target.value)}
                    onBlur={(e) => commit(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') e.currentTarget.blur()
                      else if (e.key === 'Escape') {
                        setDraft(null)
                        e.currentTarget.blur()
                      }
                    }}
                  />
                )}
              </div>
              <VariableBindingPicker
                triggerLabel={panels.applyVariable}
                searchPlaceholder={dialogs.search}
                emptyLabel={panels.noVariablesFound}
                detachLabel={panels.detachVariable}
                createLabel={panels.createStringVariable({
                  value: text.length > 20 ? `${text.slice(0, 20)}…` : text
                })}
                createNamePlaceholder={panels.variableName}
                createSubmitLabel={panels.create}
              />
            </>
          )}
        </BindableValueRoot>
      </div>
    </PanelSection>
  )
}
