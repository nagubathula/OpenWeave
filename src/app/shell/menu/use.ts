import { useEffect, useRef } from 'react'

import { useEditorCommands, useI18n } from '@openweave/react'
import type { EditorCommandId } from '@openweave/react'

import { useEditorStore } from '@/app/editor/active-store'
import { openSettingsDialog } from '@/app/settings/dialog'
import { createSharedEditorMenuActions } from '@/app/shell/menu/editor-actions'
import { importFileDialog, openFileDialog } from '@/app/shell/menu/files'
import { APP_MENU_SCHEMA, type AppMenuEntry } from '@/app/shell/menu/schema'
import { createSelectionMenuActions } from '@/app/shell/menu/selection-actions'
import { useAppTheme } from '@/app/shell/theme'
import { checkForAppUpdate } from '@/app/shell/updater'
import { createTab, closeTab, activeTab } from '@/app/tabs'
import { isTauri } from '@/app/tauri/env'
import { openStorageWorkspace } from '@/components/storage/StorageWorkspace'

function commandMenuIds(entries: readonly AppMenuEntry[]): EditorCommandId[] {
  return entries.flatMap((entry) => {
    if (entry.type === 'separator') return []
    return [...(entry.command ? [entry.command] : []), ...commandMenuIds(entry.sub ?? [])]
  })
}

const COMMAND_MENU_IDS = new Set<EditorCommandId>(
  APP_MENU_SCHEMA.flatMap((group) => commandMenuIds(group.items))
)

export { importFileDialog, openFileDialog }
export { openFileFromPath } from '@/app/shell/menu/files'

/**
 * Binds the native (Tauri) application menu to editor commands and actions.
 *
 * React hook: call once from the editor shell. No-ops in the browser. The
 * Tauri `menu-event` listener is registered in an effect and unbound on
 * unmount (the old Vue version used `tryOnScopeDispose`, which silently
 * no-ops outside a Vue effect scope — this replaces it). The editor store is
 * resolved lazily so the menu isn't pinned to whichever tab existed at mount.
 */
export function useMenu() {
  const { setTheme } = useAppTheme()
  const { dialogs } = useI18n()
  const { runCommand } = useEditorCommands()

  const latest = useRef({ setTheme, dialogs, runCommand })
  latest.current = { setTheme, dialogs, runCommand }

  useEffect(() => {
    if (!isTauri()) return

    let unlisten: (() => void) | undefined
    let cancelled = false

    const store = () => useEditorStore()
    const actions: Partial<Record<string, () => void>> = {
      new: () => createTab(),
      open: () => void openFileDialog(),
      'open-storage-workspace': () => {
        openStorageWorkspace()
      },
      close: () => {
        if (activeTab.get()) closeTab(activeTab.get()!.id)
      },
      save: () => void store().saveFigFile(),
      'save-as': () => void store().saveFigFileAs(),
      'export-selection': () => {
        if (store().state.selectedIds.size > 0) void store().exportSelection(1, 'png')
      },
      'export-png': () => {
        if (store().state.selectedIds.size > 0) void store().exportSelection(1, 'png')
      },
      'export-svg': () => {
        if (store().state.selectedIds.size > 0) void store().exportSelection(1, 'svg')
      },
      'export-pptx': () => {
        if (store().state.selectedIds.size > 0) void store().exportSelection(1, 'pptx')
      },
      'export-fig': () => {
        if (store().state.selectedIds.size > 0) void store().exportSelection(1, 'fig')
      },
      autosave: () => {
        store().state.autosaveEnabled = !store().state.autosaveEnabled
      },
      ...createSelectionMenuActions(useEditorStore()),
      'check-updates': () =>
        void checkForAppUpdate({
          messages: () => latest.current.dialogs
        }),
      settings: openSettingsDialog,
      ...createSharedEditorMenuActions((theme) => latest.current.setTheme(theme))
    }

    void import('@tauri-apps/api/event').then(({ listen }) => {
      return listen<string>('menu-event', (event) => {
        if (COMMAND_MENU_IDS.has(event.payload as EditorCommandId)) {
          latest.current.runCommand(event.payload as EditorCommandId)
          return
        }
        actions[event.payload]?.()
      }).then((fn) => {
        if (cancelled) fn()
        else unlisten = fn
        return undefined
      })
    })

    return () => {
      cancelled = true
      unlisten?.()
    }
  }, [])
}
