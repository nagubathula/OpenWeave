/* eslint-disable openweave/no-hardcoded-tip-labels */
import React, { useState, useRef, useEffect, useReducer } from 'react'
import { useStore } from '@nanostores/react'
import * as Menubar from '@radix-ui/react-menubar'
import { Check, ChevronRight, Settings, PanelLeft } from 'lucide-react'

import type { MenuEntry } from '@openweave/react'

import { useEditorStore } from '@/app/editor/active-store'
import { useEditorState } from '@/app/editor/session/use-editor-state'
import { openSettingsDialog, settingsDialogOpen } from '@/app/settings/dialog'
import { useAppMenu } from '@/app/shell/menu/app-menu'
import { isMenuAction, isMenuCheckbox } from '@/app/shell/menu/entry'
import { SettingsDialog } from '@/components/settings/SettingsDialog'
import AppShortcutText from '@/components/ui/AppShortcutText'
import { useMenuUI } from '@/components/ui/menu'
import Tip from '@/components/ui/Tip'
import { IS_TAURI } from '@/constants'

function MenuEntryItems({ items, cls }: { items: MenuEntry[]; cls: ReturnType<typeof useMenuUI> }) {
  const subCls = useMenuUI({ content: 'min-w-44' })
  return (
    <>
      {items.map((item, i) => {
        if (!isMenuAction(item)) return <Menubar.Separator key={i} className={cls.separator} />
        if (item.sub && item.sub.length > 0) {
          return (
            <Menubar.Sub key={i}>
              <Menubar.SubTrigger className={cls.item} disabled={item.disabled}>
                <span className="flex-1">{item.label}</span>
                <ChevronRight className="size-3 text-muted" />
              </Menubar.SubTrigger>
              <Menubar.Portal>
                <Menubar.SubContent sideOffset={4} className={subCls.content}>
                  <MenuEntryItems items={item.sub ?? []} cls={cls} />
                </Menubar.SubContent>
              </Menubar.Portal>
            </Menubar.Sub>
          )
        }
        if (isMenuCheckbox(item)) {
          return (
            <Menubar.CheckboxItem
              key={i}
              checked={item.checked}
              className={cls.item}
              onCheckedChange={(checked: boolean) => item.onCheckedChange?.(checked === true)}
            >
              <span className="flex-1">{item.label}</span>
              <Menubar.ItemIndicator className="text-surface">
                <Check className="size-3.5" />
              </Menubar.ItemIndicator>
            </Menubar.CheckboxItem>
          )
        }
        return (
          <Menubar.Item
            key={i}
            className={cls.item}
            disabled={item.disabled}
            onSelect={() => item.action?.()}
          >
            <span className="flex-1">{item.label}</span>
            {item.shortcut && <AppShortcutText>{item.shortcut}</AppShortcutText>}
          </Menubar.Item>
        )
      })}
    </>
  )
}

/** The File/Edit/View/Object/Text/Arrange strip shown in browser (non-Tauri) mode. */
function AppMenubar() {
  const { topMenus } = useAppMenu()
  // Recompute checked/disabled state from the stores each time a menu opens.
  const [, forceRender] = useReducer((n: number): number => n + 1, 0)
  const menuCls = useMenuUI()
  const mainMenuCls = useMenuUI({ content: 'min-w-52' })

  return (
    <div className="flex items-center px-1 pb-1">
      <Menubar.Root
        className="scrollbar-none flex items-center gap-0.5 overflow-x-auto"
        onValueChange={() => forceRender()}
      >
        {topMenus.map((menu) => (
          <Menubar.Menu key={menu.label}>
            <Menubar.Trigger
              data-test-id={`menubar-${menu.label.toLowerCase()}`}
              className="flex cursor-pointer items-center rounded px-2 py-1 text-[11px] text-surface/80 transition-colors select-none hover:bg-hover hover:text-surface data-[state=open]:bg-hover data-[state=open]:text-surface"
            >
              {menu.label}
            </Menubar.Trigger>
            <Menubar.Portal>
              <Menubar.Content sideOffset={4} align="start" className={mainMenuCls.content}>
                <MenuEntryItems items={menu.items} cls={menuCls} />
              </Menubar.Content>
            </Menubar.Portal>
          </Menubar.Menu>
        ))}
      </Menubar.Root>
    </div>
  )
}

export default function AppMenu() {
  const store = useEditorStore()
  const [isEditing, setIsEditing] = useState(false)
  // documentName follows the active store (tab switches included).
  const documentName = useEditorState((s) => s.documentName ?? '', '')
  // openSettingsDialog() is called from app code (menu model, chat provider
  // setup, vectorize) via a shared atom; this component owns the dialog.
  const settingsOpen = useStore(settingsDialogOpen)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  const commitRename = (name: string) => {
    const trimmed = name.trim()
    if (trimmed) {
      store.state.documentName = trimmed
    }
    setIsEditing(false)
  }

  return (
    <div className="shrink-0 border-b border-border">
      <div className="flex items-center gap-2 px-2 py-1.5">
        <img data-test-id="app-logo" src="/favicon-32.png" className="size-4" alt="OpenWeave" />
        {isEditing ? (
          <input
            ref={inputRef}
            data-test-id="app-document-name-input"
            className="min-w-0 flex-1 rounded border border-accent bg-input px-1 py-0.5 text-xs text-surface outline-none"
            defaultValue={documentName}
            onBlur={(e) => commitRename(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                commitRename(e.currentTarget.value)
              } else if (e.key === 'Escape') {
                setIsEditing(false)
              }
            }}
          />
        ) : (
          <span
            data-test-id="app-document-name"
            className="min-w-0 flex-1 cursor-default truncate rounded px-1 py-0.5 text-xs text-surface hover:bg-hover"
            onDoubleClick={() => setIsEditing(true)}
          >
            {documentName || 'Untitled'}
          </span>
        )}
        <Tip label="Settings" side="bottom">
          <button
            type="button"
            data-test-id="app-settings-trigger"
            className="flex size-6 shrink-0 cursor-pointer items-center justify-center rounded text-muted transition-colors hover:bg-hover hover:text-surface"
            onClick={() => openSettingsDialog()}
          >
            <Settings className="size-3.5" />
          </button>
        </Tip>
        <Tip label="Toggle UI" side="bottom">
          <button
            type="button"
            data-test-id="app-toggle-ui"
            className="flex size-6 shrink-0 cursor-pointer items-center justify-center rounded text-muted transition-colors hover:bg-hover hover:text-surface"
            onClick={() => {
              store.state.showUI = !store.state.showUI
            }}
          >
            <PanelLeft className="size-3.5" />
          </button>
        </Tip>
      </div>
      {!IS_TAURI && <AppMenubar />}
      <SettingsDialog
        open={settingsOpen}
        onClose={() => {
          settingsDialogOpen.set(false)
        }}
      />
    </div>
  )
}
