import { Check, LayoutGrid, List, Plus, Search, Unlink, X } from 'lucide-react'
import React, { useMemo, useRef, useState, useEffect } from 'react'

import { colorToCSS } from '@openweave/core/color'
import { randomHex } from '@openweave/core/random'
import { useI18n, useOptionalBindableValue } from '@openweave/react'
import type { Variable, VariableCollection } from '@openweave/scene-graph'
import type { Color } from '@openweave/scene-graph/primitives'

import { getActiveEditorStoreOrNull } from '@/app/editor/active-store'
import Tip from '@/components/ui/Tip'

export interface ColorLibrariesProps {
  color: Color
  onChange: (color: Color) => void
  creating?: boolean
  onCreatingChange?: (creating: boolean) => void
}

interface GroupedVariables {
  group: string
  variables: Array<{
    variable: Variable
    leafName: string
    color: Color
    isSelected: boolean
  }>
}

export function ColorLibraries({
  color,
  onChange,
  creating = false,
  onCreatingChange
}: ColorLibrariesProps) {
  const { panels, dialogs } = useI18n()
  const bindable = useOptionalBindableValue<Color>()
  const store = getActiveEditorStoreOrNull()

  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCollectionId, setSelectedCollectionId] = useState<string>('ALL')
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list')
  const [createName, setCreateName] = useState('')
  const createInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (creating) {
      requestAnimationFrame(() => {
        createInputRef.current?.focus()
        createInputRef.current?.select()
      })
    }
  }, [creating])

  const collections = useMemo<VariableCollection[]>(() => {
    return store?.getCollections() ?? []
  }, [store])

  const allColorVariables = useMemo<Variable[]>(() => {
    if (!store) return []
    return store.getVariablesByType('COLOR')
  }, [store])

  const filteredVariables = useMemo(() => {
    let list = allColorVariables
    if (selectedCollectionId !== 'ALL') {
      list = list.filter((v) => v.collectionId === selectedCollectionId)
    }
    if (searchTerm.trim()) {
      const q = searchTerm.trim().toLowerCase()
      list = list.filter((v) => v.name.toLowerCase().includes(q))
    }
    return list
  }, [allColorVariables, selectedCollectionId, searchTerm])

  const grouped = useMemo<GroupedVariables[]>(() => {
    const groupsMap = new Map<string, GroupedVariables['variables']>()

    for (const v of filteredVariables) {
      const lastSlash = v.name.lastIndexOf('/')
      const group = lastSlash !== -1 ? v.name.slice(0, lastSlash) : ''
      const leafName = lastSlash !== -1 ? v.name.slice(lastSlash + 1) : v.name

      const resolved = store?.resolveColorVariable(v.id) ?? { r: 0, g: 0, b: 0, a: 1 }
      const isSelected = bindable?.variable?.id === v.id

      const items = groupsMap.get(group) ?? []
      items.push({
        variable: v,
        leafName,
        color: resolved,
        isSelected
      })
      groupsMap.set(group, items)
    }

    const result: GroupedVariables[] = []
    // Ungrouped first
    if (groupsMap.has('')) {
      const ungr = groupsMap.get('')
      if (ungr) result.push({ group: '', variables: ungr })
      groupsMap.delete('')
    }
    // Then sorted alphabetically by group path
    const sortedGroupNames = [...groupsMap.keys()].sort((a, b) => a.localeCompare(b))
    for (const g of sortedGroupNames) {
      const vars = groupsMap.get(g)
      if (vars) result.push({ group: g, variables: vars })
    }
    return result
  }, [filteredVariables, store, bindable?.variable?.id])

  const handleSelect = (v: Variable, itemColor: Color) => {
    if (bindable?.actions) {
      bindable.actions.bind(v.id)
    }
    onChange(itemColor)
  }

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const name = createName.trim()
    if (!name) return

    if (bindable?.actions) {
      bindable.actions.create(name)
    } else if (store) {
      let targetCollection =
        selectedCollectionId !== 'ALL' ? store.getCollection(selectedCollectionId) : collections[0]
      if (!targetCollection) {
        const newCol: VariableCollection = {
          id: `col:${randomHex(8)}`,
          name: 'Colors',
          modes: [{ modeId: 'default', name: 'Mode 1' }],
          defaultModeId: 'default',
          variableIds: []
        }
        store.addCollection(newCol)
        targetCollection = newCol
      }
      const newVar: Variable = {
        id: `var:${randomHex(8)}`,
        name,
        type: 'COLOR',
        collectionId: targetCollection.id,
        valuesByMode: Object.fromEntries(
          targetCollection.modes.map((mode) => [mode.modeId, structuredClone(color)])
        ),
        description: '',
        hiddenFromPublishing: false
      }
      store.addVariable(newVar)
    }

    setCreateName('')
    onCreatingChange?.(false)
  }

  return (
    <div className="flex flex-col gap-2" data-slot="color-libraries">
      {/* Search Input */}
      <div className="relative flex items-center">
        <Search className="absolute left-2 size-3.5 text-muted pointer-events-none" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder={dialogs.search}
          className="w-full h-7 rounded border border-border bg-input/40 pl-7 pr-6 text-xs text-surface placeholder:text-muted focus:border-accent focus:outline-none"
        />
        {searchTerm.length > 0 && (
          <button
            type="button"
            onClick={() => setSearchTerm('')}
            aria-label={dialogs.close}
            className="absolute right-1.5 p-0.5 text-muted hover:text-surface cursor-pointer"
          >
            <X className="size-3" />
          </button>
        )}
      </div>

      {/* Filter and View mode switcher */}
      <div className="flex items-center justify-between gap-1 text-xs">
        <select
          value={selectedCollectionId}
          onChange={(e) => setSelectedCollectionId(e.target.value)}
          aria-label={dialogs.localVariables}
          className="flex-1 h-6 rounded border border-border bg-input/40 px-1.5 text-xs text-surface outline-none focus:border-accent"
        >
          <option value="ALL">All libraries</option>
          {collections.map((col) => (
            <option key={col.id} value={col.id}>
              {col.name}
            </option>
          ))}
        </select>

        <Tip label={viewMode === 'list' ? panels.gridView : panels.listView}>
          <button
            type="button"
            aria-label={viewMode === 'list' ? panels.gridView : panels.listView}
            onClick={() => setViewMode((m) => (m === 'list' ? 'grid' : 'list'))}
            className="flex size-6 shrink-0 items-center justify-center rounded border border-border bg-input/40 text-muted hover:text-surface hover:bg-hover transition-colors cursor-pointer"
          >
            {viewMode === 'list' ? (
              <LayoutGrid className="size-3.5" />
            ) : (
              <List className="size-3.5" />
            )}
          </button>
        </Tip>
      </div>

      {/* Inline Create Form */}
      {creating && (
        <form
          onSubmit={handleCreateSubmit}
          className="rounded border border-border bg-input/40 p-2 flex flex-col gap-1.5"
        >
          <div className="text-[11px] font-medium text-surface">
            {panels.createColorVariable({ value: colorToCSS(color) })}
          </div>
          <div className="flex items-center gap-1.5">
            <input
              ref={createInputRef}
              type="text"
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              placeholder={panels.variableName}
              className="flex-1 h-6 rounded border border-border bg-input/70 px-2 text-xs text-surface placeholder:text-muted focus:border-accent focus:outline-none"
            />
            <button
              type="submit"
              disabled={!createName.trim()}
              className="h-6 px-2 rounded bg-accent text-accent-foreground text-xs font-medium disabled:opacity-40 hover:bg-accent/90 transition-colors cursor-pointer"
            >
              {panels.create}
            </button>
            <button
              type="button"
              onClick={() => onCreatingChange?.(false)}
              className="h-6 px-1.5 rounded text-xs text-muted hover:text-surface hover:bg-hover transition-colors cursor-pointer"
            >
              {dialogs.cancel}
            </button>
          </div>
        </form>
      )}

      {/* Variables list / grid */}
      <div className="max-h-56 overflow-y-auto pr-0.5 space-y-2">
        {grouped.length === 0 ? (
          <div className="py-6 text-center text-xs text-muted">
            <p>{panels.noVariablesFound}</p>
            {!creating && onCreatingChange && (
              <button
                type="button"
                onClick={() => onCreatingChange(true)}
                className="mt-2 inline-flex items-center gap-1 text-[11px] text-accent hover:underline cursor-pointer"
              >
                <Plus className="size-3" />
                <span>{panels.create}</span>
              </button>
            )}
          </div>
        ) : viewMode === 'list' ? (
          <div className="space-y-2">
            {grouped.map(({ group, variables }) => (
              <div key={group || '__root'} className="space-y-0.5">
                {group.length > 0 && (
                  <div className="px-2 pt-1 pb-0.5 text-[11px] font-semibold text-muted select-none truncate">
                    {group}
                  </div>
                )}
                {variables.map(({ variable, leafName, color: itemColor, isSelected }) => (
                  <button
                    key={variable.id}
                    type="button"
                    onClick={() => handleSelect(variable, itemColor)}
                    className={`flex items-center gap-2 w-full px-2 py-1.5 rounded text-left transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-accent/20 text-accent font-medium'
                        : 'text-surface hover:bg-hover'
                    }`}
                  >
                    <span
                      className="size-4 shrink-0 rounded-xs border border-border/80 shadow-xs"
                      style={{ backgroundColor: colorToCSS(itemColor) }}
                    />
                    <span className="truncate text-xs flex-1">{leafName}</span>
                    {isSelected && <Check className="size-3.5 shrink-0 text-accent" />}
                  </button>
                ))}
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-6 gap-1.5 p-1">
            {filteredVariables.map((v) => {
              const itemColor = store?.resolveColorVariable(v.id) ?? { r: 0, g: 0, b: 0, a: 1 }
              const isSelected = bindable?.variable?.id === v.id
              return (
                <Tip key={v.id} label={v.name}>
                  <button
                    type="button"
                    aria-label={v.name}
                    onClick={() => handleSelect(v, itemColor)}
                    className={`aspect-square w-full rounded-xs border transition-transform hover:scale-105 cursor-pointer ${
                      isSelected
                        ? 'border-accent ring-2 ring-accent/40'
                        : 'border-border hover:border-border-strong'
                    }`}
                    style={{ backgroundColor: colorToCSS(itemColor) }}
                  />
                </Tip>
              )
            })}
          </div>
        )}
      </div>

      {/* Detach footer */}
      {bindable?.state === 'bound' && (
        <button
          type="button"
          onClick={() => bindable.actions.unbind()}
          className="flex items-center gap-1.5 text-xs text-muted hover:text-surface hover:bg-hover px-2 py-1.5 mt-1 border-t border-border rounded w-full transition-colors cursor-pointer"
        >
          <Unlink className="size-3.5" />
          <span>{panels.detachVariable}</span>
        </button>
      )}
    </div>
  )
}

export default ColorLibraries
