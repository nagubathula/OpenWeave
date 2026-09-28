import { useStore } from '@nanostores/react'
import * as Menubar from '@radix-ui/react-menubar'
import { Check, ChevronRight, Settings, PanelLeft, ChevronDown, Layers } from 'lucide-react'
/* eslint-disable openweave/no-hardcoded-tip-labels */
import React, { useState, useRef, useEffect, useReducer } from 'react'

import type { MenuEntry } from '@openweave/react'

import { useEditorStore } from '@/app/editor/active-store'
import { useEditorState } from '@/app/editor/session/use-editor-state'
import { openHome } from '@/app/home/store'
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

function AppMenuDropdown() {
  const { topMenus } = useAppMenu()
  const [, forceRender] = useReducer((n: number): number => n + 1, 0)
  const menuCls = useMenuUI()
  const mainMenuCls = useMenuUI({ content: 'min-w-44 z-50' })
  const subCls = useMenuUI({ content: 'min-w-44 z-50' })

  return (
    <Menubar.Root onValueChange={() => forceRender()} className="inline-flex">
      <Menubar.Menu>
        <Menubar.Trigger
          data-test-id="menubar-main-trigger"
          aria-label="Document options"
          className="flex size-4 cursor-pointer items-center justify-center rounded text-muted transition-colors hover:bg-hover hover:text-surface data-[state=open]:bg-hover data-[state=open]:text-surface outline-none"
        >
          <ChevronDown className="size-3" />
        </Menubar.Trigger>
        <Menubar.Portal>
          <Menubar.Content sideOffset={4} align="start" className={mainMenuCls.content}>
            {topMenus.map((menu) => (
              <Menubar.Sub key={menu.label}>
                <Menubar.SubTrigger className={menuCls.item}>
                  <span className="flex-1">{menu.label}</span>
                  <ChevronRight className="size-3 text-muted" />
                </Menubar.SubTrigger>
                <Menubar.Portal>
                  <Menubar.SubContent sideOffset={4} className={subCls.content}>
                    <MenuEntryItems items={menu.items} cls={menuCls} />
                  </Menubar.SubContent>
                </Menubar.Portal>
              </Menubar.Sub>
            ))}
          </Menubar.Content>
        </Menubar.Portal>
      </Menubar.Menu>
    </Menubar.Root>
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

  useEffect(() => {
    if (IS_TAURI && documentName && documentName !== 'Untitled') {
      void store.saveFigFile?.()
    }
  }, [documentName, store])

  const commitRename = async (name: string) => {
    const trimmed = name.trim()
    if (trimmed) {
      store.state.documentName = trimmed
      await store.saveFigFile?.()
    }
    setIsEditing(false)
  }

  return (
    <div className="shrink-0 border-b border-border">
      <div className="flex items-center gap-2 px-2 py-1.5">
        <Tip label="Back to files (Home)" side="bottom">
          <button
            type="button"
            data-test-id="app-logo-home"
            className="flex size-5 shrink-0 cursor-pointer items-center justify-center rounded transition-opacity hover:opacity-80 outline-none"
            onClick={() => openHome()}
          >
            <div
              data-test-id="app-logo"
              className="flex size-4.5 items-center justify-center rounded-md bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-xs"
            >
              <Layers className="size-3" />
            </div>
          </button>
        </Tip>
        {isEditing ? (
          <input
            ref={inputRef}
            data-test-id="app-document-name-input"
            className="min-w-0 flex-1 rounded border border-accent bg-input px-1.5 py-0.5 text-xs text-surface outline-none"
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
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="flex items-center gap-0.5 min-w-0">
              <span
                data-test-id="app-document-name"
                className="cursor-pointer truncate rounded px-1 py-0.5 text-xs font-semibold text-surface transition-colors hover:bg-hover"
                onClick={() => setIsEditing(true)}
              >
                {documentName || 'Untitled'}
              </span>
              <AppMenuDropdown />
            </div>
            <span className="px-1 text-[10px] leading-tight text-muted">Drafts</span>
          </div>
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
      <SettingsDialog
        open={settingsOpen}
        onClose={() => {
          settingsDialogOpen.set(false)
        }}
      />
    </div>
  )
}
