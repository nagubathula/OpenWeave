import { useStore } from '@nanostores/react'
import {
  Search,
  CornerDownLeft,
  MousePointer2,
  Square,
  Circle,
  Frame,
  Type,
  PenTool,
  Hand,
  Layers,
  Minus
} from 'lucide-react'
import { atom } from 'nanostores'
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useEventListener } from 'usehooks-ts'

import type { Tool } from '@openweave/core/editor'
import {
  useEditorCommands,
  useEditorEvent,
  useEditor,
  editorCommandMetadata,
  formatShortcut
} from '@openweave/react'
import type { EditorCommandId } from '@openweave/react'

import { useEditorStore } from '@/app/editor/active-store'
import { AppDialogRoot } from '@/components/ui/dialog'

export const isCommandPaletteOpen = atom<boolean>(false)

export function openCommandPalette() {
  isCommandPaletteOpen.set(true)
}

export function closeCommandPalette() {
  isCommandPaletteOpen.set(false)
}

export function toggleCommandPalette() {
  isCommandPaletteOpen.set(!isCommandPaletteOpen.get())
}

interface PaletteAction {
  id: string
  label: string
  category: 'Edit' | 'Selection' | 'Layout' | 'Components' | 'Tools' | 'View' | 'Export'
  shortcut?: string
  icon?: React.ReactNode
  enabled: boolean
  run: () => void
}

export default function CommandPalette() {
  const isOpen = useStore(isCommandPaletteOpen)
  const editor = useEditor()
  const store = useEditorStore()
  const { commands } = useEditorCommands()

  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // Listen to editor event
  useEditorEvent('command-palette:toggle', () => {
    toggleCommandPalette()
  })

  // Global keybinding fallback (⌘K / ⌘/)
  const handleGlobalKey = useCallback((e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K' || e.key === '/')) {
      e.preventDefault()
      toggleCommandPalette()
    }
  }, [])
  useEventListener('keydown', handleGlobalKey)

  // Focus input when dialog opens
  useEffect(() => {
    if (isOpen) {
      setQuery('')
      setSelectedIndex(0)
      requestAnimationFrame(() => {
        inputRef.current?.focus()
      })
    }
  }, [isOpen])

  // Build the complete list of actions
  const actions: PaletteAction[] = useMemo(() => {
    const list: PaletteAction[] = []

    // 1. Tools
    const tools: Array<{ id: Tool; label: string; shortcut: string; icon: React.ReactNode }> = [
      {
        id: 'SELECT',
        label: 'Select Tool',
        shortcut: 'V',
        icon: <MousePointer2 className="size-3.5" />
      },
      { id: 'FRAME', label: 'Frame Tool', shortcut: 'F', icon: <Frame className="size-3.5" /> },
      {
        id: 'RECTANGLE',
        label: 'Rectangle Tool',
        shortcut: 'R',
        icon: <Square className="size-3.5" />
      },
      {
        id: 'ELLIPSE',
        label: 'Ellipse Tool',
        shortcut: 'O',
        icon: <Circle className="size-3.5" />
      },
      { id: 'LINE', label: 'Line Tool', shortcut: 'L', icon: <Minus className="size-3.5" /> },
      { id: 'TEXT', label: 'Text Tool', shortcut: 'T', icon: <Type className="size-3.5" /> },
      { id: 'PEN', label: 'Pen Tool', shortcut: 'P', icon: <PenTool className="size-3.5" /> },
      { id: 'HAND', label: 'Hand Tool', shortcut: 'H', icon: <Hand className="size-3.5" /> }
    ]
    for (const tool of tools) {
      list.push({
        id: `tool.${tool.id}`,
        label: tool.label,
        category: 'Tools',
        shortcut: tool.shortcut,
        icon: tool.icon,
        enabled: true,
        run: () => editor.setTool(tool.id)
      })
    }

    // 2. Editor Commands from registry
    for (const [id, cmd] of Object.entries(commands)) {
      if (id === 'view.commandPalette') continue
      const meta = editorCommandMetadata(id as EditorCommandId)
      let category: PaletteAction['category'] = 'Edit'
      if (
        id.startsWith('selection.boolean') ||
        id.startsWith('selection.distribute') ||
        id.startsWith('selection.wrapInAutoLayout') ||
        id.startsWith('selection.flip')
      ) {
        category = 'Layout'
      } else if (
        id.startsWith('selection.component') ||
        id.startsWith('selection.createInstance') ||
        id.startsWith('selection.detachInstance')
      ) {
        category = 'Components'
      } else if (id.startsWith('selection.')) {
        category = 'Selection'
      } else if (id.startsWith('view.')) {
        category = 'View'
      }

      list.push({
        id,
        label: cmd.label,
        category,
        shortcut: meta?.shortcut,
        enabled: cmd.enabled,
        run: () => cmd.run()
      })
    }

    // 3. Export actions
    const hasSelection = store.state.selectedIds.size > 0
    list.push(
      {
        id: 'export.png',
        label: 'Export Selection as PNG',
        category: 'Export',
        enabled: hasSelection,
        run: () => void store.exportSelection(1, 'png')
      },
      {
        id: 'export.svg',
        label: 'Export Selection as SVG',
        category: 'Export',
        enabled: hasSelection,
        run: () => void store.exportSelection(1, 'svg')
      },
      {
        id: 'export.fig',
        label: 'Export Document as Figma (.fig)',
        category: 'Export',
        enabled: true,
        run: () => void store.saveFigFile()
      }
    )

    return list
  }, [commands, editor, store])

  // Filter actions based on search query
  const filteredActions = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return actions.filter((a) => a.enabled)

    return actions.filter((action) => {
      const labelMatch = action.label.toLowerCase().includes(q)
      const categoryMatch = action.category.toLowerCase().includes(q)
      const shortcutMatch = action.shortcut?.toLowerCase().includes(q) ?? false
      return labelMatch || categoryMatch || shortcutMatch
    })
  }, [actions, query])

  // Clamp selection when filtered list changes
  useEffect(() => {
    setSelectedIndex((prev) => {
      if (filteredActions.length === 0) return 0
      return Math.min(prev, filteredActions.length - 1)
    })
  }, [filteredActions.length])

  // Scroll active item into view
  useEffect(() => {
    if (!listRef.current) return
    const activeEl = listRef.current.querySelector<HTMLElement>('[data-active="true"]')
    activeEl?.scrollIntoView({ block: 'nearest' })
  }, [selectedIndex])

  const executeAction = (action: PaletteAction) => {
    if (!action.enabled) return
    closeCommandPalette()
    action.run()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((prev) =>
        filteredActions.length > 0 ? (prev + 1) % filteredActions.length : 0
      )
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((prev) =>
        filteredActions.length > 0
          ? (prev - 1 + filteredActions.length) % filteredActions.length
          : 0
      )
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const current = filteredActions[selectedIndex]
      if (current) executeAction(current)
    } else if (e.key === 'Escape') {
      e.preventDefault()
      closeCommandPalette()
    }
  }

  if (!isOpen) return null

  return (
    <AppDialogRoot
      open={isOpen}
      onOpenChange={(open) => isCommandPaletteOpen.set(open)}
      size="md"
      className="p-0 overflow-hidden border border-border shadow-2xl bg-panel"
    >
      <div className="flex flex-col max-h-[28rem]" onKeyDown={handleKeyDown}>
        {/* Search header */}
        <div className="flex items-center gap-2.5 border-b border-border px-3.5 py-3">
          <Search className="size-4 text-muted shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command or search actions..."
            className="flex-1 bg-transparent text-sm text-surface placeholder:text-muted outline-none"
          />
          <span className="rounded border border-border bg-input/40 px-1.5 py-0.5 text-[10px] font-mono text-muted">
            ESC
          </span>
        </div>

        {/* Results list */}
        <div ref={listRef} className="flex-1 overflow-y-auto p-1.5 space-y-0.5">
          {filteredActions.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted">
              No matching commands found for &ldquo;{query}&rdquo;
            </div>
          ) : (
            filteredActions.map((action, idx) => {
              const isSelected = idx === selectedIndex
              return (
                <button
                  key={action.id}
                  type="button"
                  data-active={isSelected}
                  disabled={!action.enabled}
                  onClick={() => executeAction(action)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex w-full items-center justify-between rounded px-2.5 py-2 text-left text-xs transition-colors ${
                    isSelected
                      ? 'bg-accent text-accent-foreground font-medium'
                      : 'text-surface hover:bg-hover'
                  } ${!action.enabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {action.icon ?? <Layers className="size-3.5 shrink-0 opacity-70" />}
                    <span className="truncate">{action.label}</span>
                    <span
                      className={`text-[10px] uppercase tracking-wider px-1.5 py-0.2 rounded border ${
                        isSelected
                          ? 'border-accent-foreground/30 text-accent-foreground/80'
                          : 'border-border text-muted bg-panel-field/40'
                      }`}
                    >
                      {action.category}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    {action.shortcut && (
                      <span
                        className={`text-[11px] font-mono ${
                          isSelected ? 'text-accent-foreground/90' : 'text-muted'
                        }`}
                      >
                        {formatShortcut(action.shortcut)}
                      </span>
                    )}
                    {isSelected && <CornerDownLeft className="size-3 shrink-0 opacity-80" />}
                  </div>
                </button>
              )
            })
          )}
        </div>

        {/* Footer hints */}
        <div className="flex items-center justify-between border-t border-border bg-panel-field/30 px-3 py-2 text-[10px] text-muted">
          <span>
            Navigate with <kbd className="font-mono font-semibold">↑</kbd>{' '}
            <kbd className="font-mono font-semibold">↓</kbd>
          </span>
          <span>
            Select with <kbd className="font-mono font-semibold">↵</kbd>
          </span>
          <span>
            Close with <kbd className="font-mono font-semibold">esc</kbd>
          </span>
        </div>
      </div>
    </AppDialogRoot>
  )
}
