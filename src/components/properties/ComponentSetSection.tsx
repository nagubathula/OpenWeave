import { Plus, Trash2 } from 'lucide-react'
import React, { useState } from 'react'

import { useEditor, useI18n, useSceneComputed, useSelectionState } from '@openweave/react'
import type { ComponentPropertyType } from '@openweave/scene-graph'

import { AppSelect } from '@/components/ui/AppSelect'
import Tip from '@/components/ui/Tip'

interface PropertyRow {
  id: string
  name: string
  type: ComponentPropertyType
  options: string[]
  defaultValue: string
}

const TYPE_ICONS: Record<string, string> = {
  VARIANT: '◇',
  TEXT: 'T',
  BOOLEAN: '◐',
  INSTANCE_SWAP: '⇄'
}

/**
 * Figma-style Properties section for a component set (or standalone
 * component): editable property definitions (add variant/text/boolean,
 * rename, delete), a "Current variant" editor when a variant child is
 * selected, and the "Add variant" action.
 */
export default function ComponentSetSection() {
  const editor = useEditor()
  const { selectedIds } = useSelectionState()
  const { panels } = useI18n()
  const [addMenuOpen, setAddMenuOpen] = useState(false)
  const [renamingId, setRenamingId] = useState<string | null>(null)

  // The set (or standalone component) the section applies to, plus the
  // selected variant child when one is selected inside a set.
  const target = useSceneComputed<{ id: string; isSet: boolean; childId: string | null } | null>(
    () => {
      void editor.state.sceneVersion
      if (selectedIds.size !== 1) return null
      const node = editor.graph.getNode([...selectedIds][0])
      if (!node) return null
      if (node.type === 'COMPONENT_SET') return { id: node.id, isSet: true, childId: null }
      if (node.type !== 'COMPONENT') return null
      const parent = node.parentId ? editor.graph.getNode(node.parentId) : null
      return parent?.type === 'COMPONENT_SET'
        ? { id: parent.id, isSet: true, childId: node.id }
        : { id: node.id, isSet: false, childId: null }
    }
  )
  const setId = target?.isSet ? target.id : null

  const rows = useSceneComputed<PropertyRow[]>(() => {
    if (!target) return []
    void editor.state.sceneVersion
    const options = setId ? editor.collectVariantOptions(setId) : new Map<string, Set<string>>()
    return editor.getComponentSetPropertyDefs(target.id).map((def) => ({
      id: def.id,
      name: def.name,
      type: def.type,
      options:
        def.type === 'VARIANT' ? [...(options.get(def.name) ?? (def.variantOptions ?? []))] : [],
      defaultValue: def.defaultValue
    }))
  })

  const currentValues = useSceneComputed<Record<string, string>>(() => {
    void editor.state.sceneVersion
    if (!target?.childId) return {}
    return { ...editor.graph.getNode(target.childId)?.componentPropertyValues }
  })

  const variantCount = useSceneComputed(() => {
    if (!setId) return 0
    void editor.state.sceneVersion
    return editor.getComponentSetVariants(setId).length
  })

  if (!target) return null

  const usedNames = new Set(rows.map((row) => row.name))
  const uniqueName = (base: string) => {
    if (!usedNames.has(base)) return base
    let n = 2
    while (usedNames.has(`${base} ${n}`)) n++
    return `${base} ${n}`
  }

  const addProperty = (type: ComponentPropertyType) => {
    setAddMenuOpen(false)
    const base =
      type === 'VARIANT'
        ? panels.propertyTypeVariant
        : type === 'TEXT'
          ? panels.propertyTypeText
          : panels.propertyTypeBoolean
    const defaultValue = type === 'VARIANT' ? 'Default' : type === 'BOOLEAN' ? 'true' : ''
    editor.addPropertyDefinition(target.id, uniqueName(base), type, defaultValue)
  }

  const variantRows = rows.filter((row) => row.type === 'VARIANT')

  return (
    <section
      aria-label={panels.componentProperties}
      className="space-y-2 border-b border-border p-3"
      data-test-id="component-set-section"
    >
      <div className="relative flex items-center justify-between">
        <span className="text-[11px] font-semibold text-muted uppercase tracking-wider">
          {panels.componentProperties}
        </span>
        <div className="flex items-center gap-0.5">
          <Tip label={panels.addVariant}>
            <button
              type="button"
              aria-label={panels.addVariant}
              data-test-id="component-set-add-variant"
              className="rounded px-1 py-0.5 text-[10px] text-muted hover:bg-hover hover:text-surface"
              onClick={() => editor.addVariant(target.id)}
            >
              {panels.addVariant}
            </button>
          </Tip>
          <Tip label={panels.addProperty}>
            <button
              type="button"
              aria-label={panels.addProperty}
              data-test-id="component-set-add-property"
              className="rounded p-0.5 text-muted hover:bg-hover hover:text-surface"
              onClick={() => setAddMenuOpen((open) => !open)}
            >
              <Plus className="size-3.5" />
            </button>
          </Tip>
          {addMenuOpen && (
            <div className="absolute top-full right-0 z-50 mt-1 w-36 rounded border border-border bg-panel py-1 shadow-lg">
              {(
                [
                  ...(setId ? (['VARIANT'] as const) : []),
                  'TEXT',
                  'BOOLEAN'
                ] as ComponentPropertyType[]
              ).map((type) => (
                <button
                  key={type}
                  type="button"
                  data-test-id={`add-property-${type.toLowerCase()}`}
                  className="flex w-full items-center gap-2 px-2 py-1 text-left text-xs text-surface hover:bg-hover"
                  onClick={() => addProperty(type)}
                >
                  <span className="text-component">{TYPE_ICONS[type]}</span>
                  {type === 'VARIANT'
                    ? panels.propertyTypeVariant
                    : type === 'TEXT'
                      ? panels.propertyTypeText
                      : panels.propertyTypeBoolean}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {rows.map((row) => (
        <div
          key={row.id}
          data-test-id="component-set-property"
          className="group/prop flex items-center gap-1.5 rounded border border-border bg-input/50 px-2 py-1 text-xs"
        >
          <span className="shrink-0 text-component">{TYPE_ICONS[row.type] ?? '◇'}</span>
          {renamingId === row.id ? (
            <input
              type="text"
              autoFocus
              defaultValue={row.name}
              aria-label={panels.renameProperty}
              className="w-full min-w-0 bg-transparent text-surface outline-none"
              onBlur={(e) => {
                const name = e.target.value.trim()
                if (name && name !== row.name) {
                  editor.renamePropertyDefinition(target.id, row.id, name)
                }
                setRenamingId(null)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') e.currentTarget.blur()
                if (e.key === 'Escape') setRenamingId(null)
              }}
            />
          ) : (
            <>
              <span
                className="shrink-0 cursor-text font-medium text-surface"
                onDoubleClick={() => setRenamingId(row.id)}
              >
                {row.name}
              </span>
              <span className="min-w-0 flex-1 truncate text-muted">
                {row.type === 'VARIANT'
                  ? row.options.length > 0
                    ? `· ${row.options.join(', ')}`
                    : ''
                  : `· ${row.defaultValue}`}
              </span>
              <Tip label={panels.deleteProperty}>
                <button
                  type="button"
                  aria-label={panels.deleteProperty}
                  className="shrink-0 rounded p-0.5 text-muted opacity-0 group-hover/prop:opacity-100 hover:bg-hover hover:text-surface"
                  onClick={() => editor.removePropertyDefinition(target.id, row.id)}
                >
                  <Trash2 className="size-3" />
                </button>
              </Tip>
            </>
          )}
        </div>
      ))}

      {target.childId && variantRows.length > 0 && (
        <div className="space-y-1.5 pt-1" data-test-id="current-variant-editor">
          <div className="text-[10px] font-medium text-muted">{panels.currentVariant}</div>
          {variantRows.map((row) => (
            <div key={row.id} className="flex items-center gap-2 text-xs">
              <Tip label={row.name}>
                <span className="w-16 shrink-0 truncate text-[11px] text-muted">{row.name}</span>
              </Tip>
              <div className="flex-1">
                <AppSelect
                  label={row.name}
                  options={row.options.map((value) => ({ value, label: value }))}
                  value={currentValues[row.name] ?? ''}
                  onValueChange={(value) => {
                    if (target.childId) {
                      editor.setVariantPropertyValue(target.childId, row.name, value)
                    }
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {setId ? (
        <div className="text-[10px] text-muted">
          {panels.variantCount({ count: String(variantCount) })}
        </div>
      ) : (
        <div className="text-[10px] text-muted">{panels.addVariantHint}</div>
      )}
    </section>
  )
}
