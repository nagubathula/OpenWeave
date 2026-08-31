import React from 'react'

import { useEditor, useI18n, useSceneComputed, useSelectionState } from '@openweave/react'
import type { ComponentPropertyReferenceField } from '@openweave/scene-graph'

import { AppSelect } from '@/components/ui/AppSelect'

interface BindingRow {
  field: ComponentPropertyReferenceField
  label: string
  options: { value: string; label: string }[]
  value: string
}

/**
 * Layer-side component-property bindings, for layers inside a main component:
 * tie a text layer's content to a TEXT property, or any layer's visibility to
 * a BOOLEAN property. The instance panel then exposes those as editable
 * controls (Figma's "Apply text property" / "Apply boolean property").
 */
export default function PropertyBindingSection() {
  const editor = useEditor()
  const { selectedIds } = useSelectionState()
  const { panels } = useI18n()

  const rows = useSceneComputed<{ nodeId: string; bindings: BindingRow[] } | null>(() => {
    void editor.state.sceneVersion
    if (selectedIds.size !== 1) return null
    const node = editor.graph.getNode([...selectedIds][0])
    if (!node) return null
    if (node.type === 'COMPONENT' || node.type === 'COMPONENT_SET' || node.type === 'INSTANCE') {
      return null
    }

    const { ownerId, defs } = editor.componentPropertyDefsForNode(node.id)
    if (!ownerId) return null

    const boundId = (field: ComponentPropertyReferenceField) =>
      node.componentPropertyReferences.find((ref) => ref.field === field)?.propertyId ?? ''
    const toOptions = (type: 'TEXT' | 'BOOLEAN') => [
      { value: '', label: panels.propertyNone },
      ...defs.filter((def) => def.type === type).map((def) => ({ value: def.id, label: def.name }))
    ]

    const bindings: BindingRow[] = []
    if (node.type === 'TEXT') {
      const options = toOptions('TEXT')
      if (options.length > 1) {
        bindings.push({
          field: 'TEXT',
          label: panels.bindTextProperty,
          options,
          value: boundId('TEXT')
        })
      }
    }
    const booleanOptions = toOptions('BOOLEAN')
    if (booleanOptions.length > 1) {
      bindings.push({
        field: 'VISIBLE',
        label: panels.bindVisibleProperty,
        options: booleanOptions,
        value: boundId('VISIBLE')
      })
    }
    return bindings.length > 0 ? { nodeId: node.id, bindings } : null
  })

  if (!rows) return null

  return (
    <section
      aria-label={panels.componentProperties}
      className="space-y-2 border-b border-border p-3"
      data-test-id="property-binding-section"
    >
      <div className="text-[11px] font-semibold text-muted uppercase tracking-wider">
        {panels.componentProperties}
      </div>
      {rows.bindings.map((binding) => (
        <div key={binding.field} className="flex items-center gap-2 text-xs">
          <span className="w-16 shrink-0 truncate text-[11px] text-muted">{binding.label}</span>
          <div className="flex-1" data-test-id={`property-binding-${binding.field.toLowerCase()}`}>
            <AppSelect
              label={binding.label}
              options={binding.options}
              value={binding.value}
              onValueChange={(value) =>
                editor.setComponentPropertyReference(rows.nodeId, binding.field, value || null)
              }
            />
          </div>
        </div>
      ))}
    </section>
  )
}
