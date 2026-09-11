import * as Popover from '@radix-ui/react-popover'
import { ArrowLeftRight, Check, Search, Component as ComponentIcon, Star } from 'lucide-react'
import React, { useMemo, useState, useSyncExternalStore } from 'react'

import type { ComponentPropertyDefinition, SceneNode } from '@openweave/scene-graph'

import { useEditorStore } from '@/app/editor/active-store'
import {
  ensureLibraryComponentInDocument,
  getSharedLibrariesServerSnapshot,
  listSharedLibraries,
  subscribeSharedLibraries,
  type SharedLibraryComponent
} from '@/app/libraries/library-store'

interface ComponentSlotPickerProps {
  label: string
  definition?: ComponentPropertyDefinition
  value: string
  onValueChange: (value: string) => void
}

export default function ComponentSlotPicker({
  label,
  definition,
  value,
  onValueChange
}: ComponentSlotPickerProps) {
  const editor = useEditorStore()
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const libraries = useSyncExternalStore(
    subscribeSharedLibraries,
    listSharedLibraries,
    getSharedLibrariesServerSnapshot
  )

  // All local components in this document
  const localComponents = useMemo(() => {
    return [...editor.graph.nodes.values()].filter(
      (n) => n.type === 'COMPONENT' || n.type === 'COMPONENT_SET'
    )
  }, [editor, editor.state.sceneVersion])

  const preferredSet = useMemo(() => {
    return new Set(definition?.preferredValues)
  }, [definition])

  // Current display label
  const currentLabel = useMemo(() => {
    if (!value) return 'None'
    const direct = editor.graph.getNode(value)
    if (direct) return direct.name
    // Check in shared libraries
    for (const lib of libraries) {
      const found = lib.components.find((c) => c.id === value || c.key === value)
      if (found) return `${found.name} (${lib.name})`
    }
    return value
  }, [value, editor, libraries])

  const filteredLocal = useMemo(() => {
    const q = search.trim().toLowerCase()
    return localComponents.filter((c) => !q || c.name.toLowerCase().includes(q))
  }, [localComponents, search])

  const preferredComponents = useMemo(() => {
    return filteredLocal.filter(
      (c) => preferredSet.has(c.id) || preferredSet.has(c.componentKey ?? '')
    )
  }, [filteredLocal, preferredSet])

  const otherLocalComponents = useMemo(() => {
    return filteredLocal.filter(
      (c) => !preferredSet.has(c.id) && !preferredSet.has(c.componentKey ?? '')
    )
  }, [filteredLocal, preferredSet])

  const activeLibraries = useMemo(() => {
    return libraries.filter((l) => l.enabled)
  }, [libraries])

  const handleSelectLocal = (comp: SceneNode) => {
    onValueChange(comp.id)
    setOpen(false)
  }

  const handleSelectLibraryComp = (libId: string, libComp: SharedLibraryComponent) => {
    const docId = ensureLibraryComponentInDocument(
      {
        getAllNodes: () => [...editor.graph.nodes.values()],
        getNode: (id) => editor.graph.getNode(id),
        setNode: (node) => {
          editor.graph.nodes.set(node.id, node)
        },
        currentPageId: editor.state.currentPageId
      },
      libId,
      libComp
    )
    onValueChange(docId)
    setOpen(false)
  }

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          aria-label={`Swap ${label}`}
          data-test-id="slot-picker-trigger"
          className="flex min-w-0 flex-1 items-center justify-between gap-1.5 rounded border border-border bg-input/40 px-2 py-1 text-xs text-surface hover:border-border-strong hover:bg-hover focus-visible:ring-1 focus-visible:ring-accent"
        >
          <div className="flex items-center gap-1.5 min-w-0 truncate">
            <ComponentIcon className="size-3 shrink-0 text-component" />
            <span className="truncate">{currentLabel}</span>
          </div>
          <ArrowLeftRight className="size-3 shrink-0 text-muted" />
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          side="left"
          align="start"
          sideOffset={6}
          data-test-id="slot-picker-content"
          className="z-50 w-64 rounded-lg border border-border bg-panel p-2 shadow-xl outline-none"
        >
          <div className="relative mb-2">
            <Search className="absolute left-2 top-2 size-3.5 text-muted" />
            <input
              type="search"
              autoFocus
              placeholder="Search components…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded border border-border bg-input/50 py-1 pl-7 pr-2 text-xs text-surface outline-none placeholder:text-muted focus:border-accent"
            />
          </div>

          <div className="max-h-60 space-y-3 overflow-y-auto pr-1">
            {/* Preferred components */}
            {preferredComponents.length > 0 && (
              <div>
                <div className="flex items-center gap-1 px-1 mb-1 text-[10px] font-semibold text-muted uppercase tracking-wider">
                  <Star className="size-2.5 fill-accent text-accent" />
                  <span>Preferred</span>
                </div>
                <div className="space-y-0.5">
                  {preferredComponents.map((comp) => {
                    const isSelected = comp.id === value
                    return (
                      <button
                        key={comp.id}
                        type="button"
                        className={`flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-xs transition-colors hover:bg-hover ${
                          isSelected ? 'bg-accent/20 text-accent font-medium' : 'text-surface'
                        }`}
                        onClick={() => handleSelectLocal(comp)}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span className="text-component">◇</span>
                          <span className="truncate">{comp.name}</span>
                        </div>
                        {isSelected && <Check className="size-3.5 shrink-0" />}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Local components */}
            <div>
              <div className="px-1 mb-1 text-[10px] font-semibold text-muted uppercase tracking-wider">
                Local Components ({otherLocalComponents.length})
              </div>
              {otherLocalComponents.length === 0 && preferredComponents.length === 0 ? (
                <p className="px-2 py-2 text-center text-[11px] text-muted">No components match</p>
              ) : (
                <div className="space-y-0.5">
                  {otherLocalComponents.map((comp) => {
                    const isSelected = comp.id === value
                    return (
                      <button
                        key={comp.id}
                        type="button"
                        className={`flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-xs transition-colors hover:bg-hover ${
                          isSelected ? 'bg-accent/20 text-accent font-medium' : 'text-surface'
                        }`}
                        onClick={() => handleSelectLocal(comp)}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span className="text-component">◇</span>
                          <span className="truncate">{comp.name}</span>
                        </div>
                        {isSelected && <Check className="size-3.5 shrink-0" />}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Active shared libraries */}
            {activeLibraries.map((lib) => {
              const q = search.trim().toLowerCase()
              const matching = lib.components.filter((c) => !q || c.name.toLowerCase().includes(q))
              if (matching.length === 0) return null

              return (
                <div key={lib.id}>
                  <div className="px-1 mb-1 text-[10px] font-semibold text-muted uppercase tracking-wider">
                    {lib.name} ({matching.length})
                  </div>
                  <div className="space-y-0.5">
                    {matching.map((comp) => (
                      <button
                        key={comp.id}
                        type="button"
                        className="flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-xs text-surface hover:bg-hover transition-colors"
                        onClick={() => handleSelectLibraryComp(lib.id, comp)}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span className="text-accent">📦</span>
                          <span className="truncate">{comp.name}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
