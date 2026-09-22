import {
  Check,
  Edit2,
  LayoutGrid,
  Palette,
  Plus,
  Search,
  Sparkles,
  Trash2,
  Type
} from 'lucide-react'
import React, { useMemo, useState } from 'react'

import { colorToCSS, colorToHex } from '@openweave/core/color'
import type { SharedStyle, SharedStyleKind, SharedStyleType } from '@openweave/scene-graph'

import { useEditorStore } from '@/app/editor/active-store'
import { AppDialogHeader, AppDialogRoot } from '@/components/ui/dialog'
import Tip from '@/components/ui/Tip'

export interface StylesDialogProps {
  _brand?: 'StylesDialog'
  open: boolean
  onClose: () => void
}

type FilterCategory = 'ALL' | SharedStyleType

export default function StylesDialog({ open, onClose }: StylesDialogProps) {
  const editor = useEditorStore()
  const [filter, setFilter] = useState<FilterCategory>('ALL')
  const [search, setSearch] = useState('')
  const [editingStyleId, setEditingStyleId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [newStyleKind, setNewStyleKind] = useState<SharedStyleKind>('fill')
  const [newStyleName, setNewStyleName] = useState('')
  const [createOpen, setCreateOpen] = useState(false)

  // Retrieve all shared styles
  const allStyles = useMemo(() => {
    void editor.state.sceneVersion
    return editor.getSharedStyles()
  }, [editor, editor.state.sceneVersion])

  // Compute usage counts for each style across the entire document
  const usageCounts = useMemo(() => {
    void editor.state.sceneVersion
    const counts = new Map<string, number>()
    for (const node of editor.graph.getAllNodes()) {
      if (node.fillStyleId) counts.set(node.fillStyleId, (counts.get(node.fillStyleId) ?? 0) + 1)
      if (node.strokeStyleId)
        counts.set(node.strokeStyleId, (counts.get(node.strokeStyleId) ?? 0) + 1)
      if (node.textStyleId) counts.set(node.textStyleId, (counts.get(node.textStyleId) ?? 0) + 1)
      if (node.effectStyleId)
        counts.set(node.effectStyleId, (counts.get(node.effectStyleId) ?? 0) + 1)
      if (node.gridStyleId) counts.set(node.gridStyleId, (counts.get(node.gridStyleId) ?? 0) + 1)
    }
    return counts
  }, [editor, editor.state.sceneVersion])

  // Filtered styles based on category and search query
  const filteredStyles = useMemo(() => {
    const q = search.trim().toLowerCase()
    return allStyles.filter((s) => {
      if (filter !== 'ALL' && s.type !== filter) return false
      if (q && !s.name.toLowerCase().includes(q)) return false
      return true
    })
  }, [allStyles, filter, search])

  const startRename = (style: SharedStyle) => {
    setEditingStyleId(style.id)
    setEditName(style.name)
  }

  const commitRename = (styleId: string) => {
    if (editingStyleId === styleId) {
      const trimmed = editName.trim()
      if (trimmed) {
        editor.updateSharedStyle(styleId, { name: trimmed })
      }
      setEditingStyleId(null)
      setEditName('')
    }
  }

  const handleDelete = (styleId: string) => {
    editor.deleteSharedStyle(styleId)
  }

  const handleCreate = (e?: React.FormEvent) => {
    e?.preventDefault()
    const trimmed = newStyleName.trim()
    const fallbackName = `${newStyleKind.charAt(0).toUpperCase() + newStyleKind.slice(1)} Style ${allStyles.length + 1}`
    editor.createSharedStyle(newStyleKind, trimmed || fallbackName)
    setNewStyleName('')
    setCreateOpen(false)
  }

  return (
    <AppDialogRoot open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <div className="w-[560px] max-w-[90vw] overflow-hidden rounded-xl border border-border bg-panel shadow-2xl">
        <AppDialogHeader heading="Design System Styles" />

        <div className="flex items-center justify-between border-b border-border bg-input/20 px-4 py-2">
          {/* Category Tabs */}
          <div className="flex gap-1">
            {(
              [
                { id: 'ALL', label: 'All', icon: null },
                { id: 'FILL', label: 'Colors', icon: Palette },
                { id: 'TEXT', label: 'Typography', icon: Type },
                { id: 'EFFECT', label: 'Effects', icon: Sparkles },
                { id: 'GRID', label: 'Grids', icon: LayoutGrid }
              ] as const
            ).map((tab) => {
              const Icon = tab.icon
              const count =
                tab.id === 'ALL'
                  ? allStyles.length
                  : allStyles.filter((s) => s.type === tab.id).length
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFilter(tab.id)}
                  className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                    filter === tab.id
                      ? 'bg-accent/20 text-accent'
                      : 'text-muted hover:bg-hover hover:text-surface'
                  }`}
                >
                  {Icon && <Icon className="size-3" />}
                  <span>{tab.label}</span>
                  <span className="text-[10px] opacity-70">({count})</span>
                </button>
              )
            })}
          </div>

          <button
            type="button"
            onClick={() => setCreateOpen((prev) => !prev)}
            className="flex items-center gap-1 rounded bg-accent/15 px-2 py-1 text-xs font-medium text-accent hover:bg-accent/25 transition-colors"
          >
            <Plus className="size-3.5" />
            <span>New Style</span>
          </button>
        </div>

        {/* Quick Style Creation Drawer */}
        {createOpen && (
          <form
            onSubmit={handleCreate}
            className="flex items-center gap-2 border-b border-border bg-input/40 px-4 py-2.5 text-xs"
          >
            <span className="font-medium text-surface shrink-0">Add Style:</span>
            <select
              value={newStyleKind}
              onChange={(e) => setNewStyleKind(e.target.value as SharedStyleKind)}
              aria-label="Style kind"
              className="h-7 rounded border border-border bg-input px-2 text-xs text-surface outline-none focus:border-accent"
            >
              <option value="fill">Color (Fill)</option>
              <option value="text">Typography</option>
              <option value="effect">Effect (Shadow/Blur)</option>
              <option value="grid">Layout Grid</option>
            </select>
            <input
              type="text"
              value={newStyleName}
              onChange={(e) => setNewStyleName(e.target.value)}
              placeholder="Style name"
              autoFocus
              className="h-7 flex-1 rounded border border-border bg-input px-2 text-xs text-surface placeholder:text-muted outline-none focus:border-accent"
            />
            <button
              type="submit"
              className="h-7 rounded bg-accent px-3 font-semibold text-accent-foreground hover:bg-accent/90 transition-colors"
            >
              Create
            </button>
            <button
              type="button"
              onClick={() => setCreateOpen(false)}
              className="h-7 rounded px-2 text-muted hover:bg-hover hover:text-surface transition-colors"
            >
              Cancel
            </button>
          </form>
        )}

        <div className="p-4 space-y-3">
          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-2.5 top-2 size-3.5 text-muted" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter styles by name…"
              className="w-full rounded-md border border-border bg-input/40 py-1.5 pl-8 pr-3 text-xs text-surface outline-none placeholder:text-muted focus:border-accent"
            />
          </div>

          {/* Styles List */}
          <div className="max-h-80 space-y-1.5 overflow-y-auto pr-1">
            {filteredStyles.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted">
                {search ? 'No styles match your search filter' : 'No shared styles created yet'}
              </div>
            ) : (
              filteredStyles.map((style) => {
                const node = editor.graph.getNode(style.nodeId)
                const usage = usageCounts.get(style.id) ?? 0
                const isEditing = editingStyleId === style.id

                return (
                  <div
                    key={style.id}
                    className="flex items-center justify-between rounded-lg border border-border bg-input/20 px-3 py-2 text-xs hover:border-border-strong hover:bg-hover/50 transition-colors group"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {/* Swatch / Preview */}
                      <StylePreview style={style} node={node} />

                      {/* Name & Details */}
                      <div className="min-w-0 flex-1">
                        {isEditing ? (
                          <div className="flex items-center gap-1.5">
                            <input
                              type="text"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') commitRename(style.id)
                                if (e.key === 'Escape') setEditingStyleId(null)
                              }}
                              autoFocus
                              className="h-6 rounded border border-accent bg-input px-2 text-xs text-surface outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => commitRename(style.id)}
                              className="rounded p-1 text-accent hover:bg-hover"
                            >
                              <Check className="size-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-baseline gap-2">
                            <span
                              className="font-medium text-surface truncate cursor-pointer hover:underline"
                              onDoubleClick={() => startRename(style)}
                            >
                              {style.name}
                            </span>
                            <span className="text-[10px] text-muted shrink-0">
                              {usage === 0
                                ? 'Unused'
                                : `Used in ${usage} layer${usage === 1 ? '' : 's'}`}
                            </span>
                          </div>
                        )}
                        <p className="text-[11px] text-muted truncate">
                          <StyleDetailSummary style={style} node={node} />
                        </p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
                      <Tip label="Rename style">
                        <button
                          type="button"
                          onClick={() => startRename(style)}
                          className="rounded p-1 text-muted hover:bg-hover hover:text-surface"
                        >
                          <Edit2 className="size-3.5" />
                        </button>
                      </Tip>
                      <Tip label="Delete style">
                        <button
                          type="button"
                          onClick={() => handleDelete(style.id)}
                          className="rounded p-1 text-muted hover:bg-hover hover:text-red-400"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </Tip>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>
    </AppDialogRoot>
  )
}

function StylePreview({
  style,
  node
}: {
  style: SharedStyle
  node: ReturnType<ReturnType<typeof useEditorStore>['graph']['getNode']>
}) {
  if (style.type === 'FILL') {
    const firstFill = node?.fills?.[0]
    if (firstFill?.type === 'SOLID' && firstFill.color) {
      return (
        <div
          className="size-7 rounded border border-border shrink-0 shadow-inner"
          style={{ backgroundColor: colorToCSS(firstFill.color) }}
        />
      )
    }
    return (
      <div className="flex size-7 items-center justify-center rounded border border-border bg-input/40 shrink-0">
        <Palette className="size-4 text-accent" />
      </div>
    )
  }

  if (style.type === 'TEXT') {
    return (
      <div className="flex size-7 items-center justify-center rounded border border-border bg-input/40 shrink-0 font-serif font-bold text-xs text-surface">
        Ag
      </div>
    )
  }

  if (style.type === 'EFFECT') {
    return (
      <div className="flex size-7 items-center justify-center rounded border border-border bg-input/40 shrink-0">
        <Sparkles className="size-4 text-purple-400" />
      </div>
    )
  }

  return (
    <div className="flex size-7 items-center justify-center rounded border border-border bg-input/40 shrink-0">
      <LayoutGrid className="size-4 text-blue-400" />
    </div>
  )
}

function StyleDetailSummary({
  style,
  node
}: {
  style: SharedStyle
  node: ReturnType<ReturnType<typeof useEditorStore>['graph']['getNode']>
}) {
  if (style.type === 'FILL') {
    const firstFill = node?.fills?.[0]
    if (firstFill?.type === 'SOLID' && firstFill.color) {
      return colorToHex(firstFill.color)
    }
    return 'Color Fill'
  }

  if (style.type === 'TEXT') {
    const family = node?.fontFamily ?? 'Inter'
    const size = node?.fontSize ?? 14
    const weight = node?.fontWeight ?? 400
    return `${family} · ${size}px · weight ${weight}`
  }

  if (style.type === 'EFFECT') {
    const firstEffect = node?.effects?.[0]
    if (firstEffect) {
      return `${firstEffect.type.replace('_', ' ').toLowerCase()} (radius ${firstEffect.radius ?? 0}px)`
    }
    return 'Effect'
  }

  if (style.type === 'GRID') {
    const firstGrid = node?.layoutGrids?.[0]
    if (firstGrid) {
      return `${firstGrid.pattern ?? 'Grid'} (${firstGrid.count ?? 'auto'} sections)`
    }
    return 'Layout Grid'
  }

  return ''
}
