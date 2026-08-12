import React, { useEffect, useReducer, useRef, useState } from 'react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { Check } from 'lucide-react'
import { watch } from 'vue'

import { useI18n } from '@openweave/react'

import { getActiveEditorStore } from '@/app/editor/active-store'

/**
 * Ported from src/components/editor/ZoomDropdown.vue.
 *
 * Zoom control shown in the properties-panel header: current zoom %, an editable
 * zoom field, zoom in/out, zoom-to-fit, presets, and ruler / remote-cursor
 * toggles. Reads/writes the editor store directly (zoom + toggles are Vue refs,
 * bridged to React with a `watch`).
 */
const ZOOM_PRESETS: ReadonlyArray<{ label: string; level: number }> = [
  { label: '50%', level: 0.5 },
  { label: '100%', level: 1 },
  { label: '200%', level: 2 }
]

const itemCls =
  'relative flex cursor-pointer items-center rounded px-2 py-1 pl-7 text-xs text-surface outline-none select-none data-[highlighted]:bg-hover'

export default function ZoomDropdown() {
  const { menu, commands, panels } = useI18n()
  const [, force] = useReducer((n: number): number => n + 1, 0)
  const [editing, setEditing] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const store = getActiveEditorStore()
    const stop = watch(
      () => [store.state.zoom, store.state.showRulers, store.state.showRemoteCursors] as const,
      () => force()
    )
    return stop
  }, [])

  const store = getActiveEditorStore()
  const zoomPercent = Math.round(store.state.zoom * 100)

  const startEditing = () => {
    setInputValue(String(zoomPercent))
    setEditing(true)
    requestAnimationFrame(() => inputRef.current?.select())
  }
  const commitInput = () => {
    const parsed = Number.parseInt(inputValue, 10)
    if (!Number.isNaN(parsed) && parsed > 0) store.zoomToLevel(parsed / 100)
    setEditing(false)
  }
  const zoomBy = (factor: number) => store.zoomToLevel(store.state.zoom * factor)
  const isActivePreset = (level: number) => Math.abs(store.state.zoom - level) < 0.005
  const toggleRulers = () => {
    store.state.showRulers = !store.state.showRulers
    store.requestRepaint()
  }
  const toggleRemoteCursors = () => {
    store.state.showRemoteCursors = !store.state.showRemoteCursors
    store.requestRepaint()
  }

  return (
    <DropdownMenu.Root
      onOpenChange={(open) => {
        if (!open) setEditing(false)
      }}
    >
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          data-test-id="zoom-dropdown-trigger"
          className="cursor-pointer rounded px-1.5 py-0.5 text-[11px] text-muted hover:bg-hover"
        >
          {zoomPercent}%
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          side="bottom"
          sideOffset={4}
          align="end"
          className="z-50 min-w-52 rounded-md border border-border bg-panel p-1 shadow-lg"
        >
          <div className="px-1 py-1">
            {editing ? (
              <input
                ref={inputRef}
                value={inputValue}
                data-test-id="zoom-input"
                className="w-full rounded border border-accent bg-input px-2 py-1 text-xs text-surface outline-none"
                onChange={(e) => setInputValue(e.target.value)}
                onBlur={commitInput}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitInput()
                  if (e.key === 'Escape') {
                    e.stopPropagation()
                    setEditing(false)
                  }
                }}
              />
            ) : (
              <button
                type="button"
                data-test-id="zoom-input-trigger"
                className="w-full cursor-pointer rounded border border-border bg-input px-2 py-1 text-left text-xs text-surface hover:border-muted"
                onClick={(e) => {
                  e.preventDefault()
                  startEditing()
                }}
              >
                {zoomPercent}%
              </button>
            )}
          </div>

          <DropdownMenu.Separator className="my-1 h-px bg-border" />

          <DropdownMenu.Item className={itemCls} onSelect={() => zoomBy(1.2)}>
            <span className="flex-1">{menu.zoomIn}</span>
          </DropdownMenu.Item>
          <DropdownMenu.Item className={itemCls} onSelect={() => zoomBy(1 / 1.2)}>
            <span className="flex-1">{menu.zoomOut}</span>
          </DropdownMenu.Item>
          <DropdownMenu.Item className={itemCls} onSelect={() => store.zoomToFit()}>
            <span className="flex-1">{commands.zoomToFit}</span>
          </DropdownMenu.Item>
          {ZOOM_PRESETS.map((preset) => (
            <DropdownMenu.Item
              key={preset.level}
              className={itemCls}
              onSelect={() => store.zoomToLevel(preset.level)}
            >
              {isActivePreset(preset.level) && <Check className="absolute left-2 size-3.5" />}
              <span className="flex-1">{preset.label}</span>
            </DropdownMenu.Item>
          ))}

          <DropdownMenu.Separator className="my-1 h-px bg-border" />

          <DropdownMenu.Item
            className={itemCls}
            onSelect={(e) => {
              e.preventDefault()
              toggleRulers()
            }}
          >
            {store.state.showRulers && <Check className="absolute left-2 size-3.5" />}
            <span className="flex-1">{panels.rulers}</span>
          </DropdownMenu.Item>
          <DropdownMenu.Item
            className={itemCls}
            onSelect={(e) => {
              e.preventDefault()
              toggleRemoteCursors()
            }}
          >
            {store.state.showRemoteCursors && <Check className="absolute left-2 size-3.5" />}
            <span className="flex-1">{panels.multiplayerCursors}</span>
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}
