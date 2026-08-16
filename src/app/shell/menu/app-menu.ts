import type { MenuEntry } from '@openweave/react'
import { useEditorCommands, useI18n } from '@openweave/react'

import { useEditorStore } from '@/app/editor/active-store'
import { openSettingsDialog } from '@/app/settings/dialog'
import { createSharedEditorMenuActions } from '@/app/shell/menu/editor-actions'
import type { AppMenuActionItem, AppMenuEntry, AppMenuGroupSchema } from '@/app/shell/menu/schema'
import { APP_MENU_SCHEMA } from '@/app/shell/menu/schema'
import { createSelectionMenuActions } from '@/app/shell/menu/selection-actions'
import { appMenuShortcutLabel } from '@/app/shell/menu/shortcut'
import { openFileDialog } from '@/app/shell/menu/files'
import { useAppTheme } from '@/app/shell/theme'
import { closeTab, activeTab, createTab } from '@/app/tabs'
import { openStorageWorkspace } from '@/components/storage/StorageWorkspace'

export interface AppMenuGroup {
  label: string
  items: MenuEntry[]
}

// Theme state is module-scope Vue reactivity; grabbing it once avoids stacking
// `useAppTheme`'s watchers on every menu render.
const { theme, setTheme } = useAppTheme()

function isVisible(entry: { target?: string }): boolean {
  return entry.target !== 'native'
}

function isSeparator(entry: AppMenuEntry): entry is Extract<AppMenuEntry, { type: 'separator' }> {
  return entry.type === 'separator'
}

/**
 * Builds the browser menubar model (File/Edit/View/Object/Text/Arrange) from
 * APP_MENU_SCHEMA. Ported from the Vue composable; the vue-router storage
 * navigation is replaced by `openStorageWorkspace()`, and the result is a plain
 * array recomputed per render instead of a Vue computed.
 */
export function useAppMenu(): { topMenus: AppMenuGroup[] } {
  const store = useEditorStore()
  const {
    commands,
    menuItem: commandMenuItem,
    otherPages,
    moveSelectionToPage
  } = useEditorCommands()
  const { menu, locale, availableLocales, localeLabels, setLocale } = useI18n()

  const translatedMenuItemLabels: Partial<Record<string, keyof typeof menu>> = {
    new: 'new',
    open: 'open',
    'open-storage-workspace': 'openStorageWorkspace',
    save: 'save',
    'save-as': 'saveAs',
    'export-selection': 'exportSelection',
    autosave: 'autosave',
    close: 'closeTab',
    copy: 'copy',
    cut: 'cut',
    paste: 'paste',
    'paste-to-replace': 'pasteToReplace',
    'selection.rename': 'renameSelection',
    'selection.moveToPage': 'moveToPage',
    language: 'language',
    settings: 'settings',
    'view-rulers': 'rulers',
    'view-multiplayer-cursors': 'multiplayerCursors',
    profiler: 'profiler',
    'toggle-ui': 'toggleUI',
    theme: 'theme',
    'theme-light': 'themeLight',
    'theme-dark': 'themeDark',
    'theme-auto': 'themeAuto',
    'zoom-in': 'zoomIn',
    'zoom-out': 'zoomOut',
    'text.bold': 'bold',
    'text.italic': 'italic',
    'text.underline': 'underline',
    'arrange.align-left': 'arrangeAlignLeft',
    'arrange.align-center': 'arrangeAlignCenter',
    'arrange.align-right': 'arrangeAlignRight',
    'arrange.align-top': 'arrangeAlignTop',
    'arrange.align-middle': 'arrangeAlignMiddle',
    'arrange.align-bottom': 'arrangeAlignBottom'
  }

  const languageMenu: MenuEntry[] = availableLocales.map((code) => ({
    label: localeLabels[code],
    checked: String(locale) === code,
    onCheckedChange: (checked: boolean) => {
      if (checked) setLocale(code)
    }
  }))

  function exportSelection(format: 'png' | 'svg' | 'pptx' | 'fig') {
    if (store.state.selectedIds.size > 0) void store.exportSelection(1, format)
  }

  const actions: Partial<Record<string, () => void>> = {
    new: () => {
      createTab()
    },
    open: () => void openFileDialog(),
    'open-storage-workspace': () => openStorageWorkspace(),
    save: () => void store.saveFigFile(),
    'save-as': () => void store.saveFigFileAs(),
    'export-selection': () => exportSelection('png'),
    ...createSelectionMenuActions(store),
    close: () => {
      if (activeTab.get()) closeTab(activeTab.get()!.id)
    },
    settings: openSettingsDialog,
    'export-png': () => exportSelection('png'),
    'export-svg': () => exportSelection('svg'),
    'export-pptx': () => exportSelection('pptx'),
    'export-fig': () => exportSelection('fig'),
    ...createSharedEditorMenuActions(setTheme)
  }

  function itemAction(item: AppMenuActionItem): (() => void) | undefined {
    return actions[item.id]
  }

  function checked(item: AppMenuActionItem): boolean | undefined {
    switch (item.id) {
      case 'autosave':
        return store.state.autosaveEnabled
      case 'profiler':
        return store.renderer?.profiler.hudVisible ?? false
      case 'view-rulers':
        return store.state.showRulers
      case 'view-multiplayer-cursors':
        return store.state.showRemoteCursors
      case 'theme-light':
        return theme.get() === 'light'
      case 'theme-dark':
        return theme.get() === 'dark'
      case 'theme-auto':
        return theme.get() === 'auto'
      default:
        return undefined
    }
  }

  function onCheckedChange(item: AppMenuActionItem): ((checked: boolean) => void) | undefined {
    switch (item.id) {
      case 'autosave':
        return (value: boolean) => {
          store.state.autosaveEnabled = value
        }
      case 'profiler':
        return () => store.toggleProfiler()
      case 'view-rulers':
        return (value: boolean) => {
          if (store.state.showRulers !== value) itemAction(item)?.()
        }
      case 'view-multiplayer-cursors':
        return (value: boolean) => {
          if (store.state.showRemoteCursors !== value) itemAction(item)?.()
        }
      case 'theme-light':
      case 'theme-dark':
      case 'theme-auto':
        return (value: boolean) => {
          if (value) itemAction(item)?.()
        }
      default:
        return undefined
    }
  }

  function menuLabel(entry: AppMenuActionItem): string {
    const key = translatedMenuItemLabels[entry.id]
    return key ? menu[key] : entry.label
  }

  function buildEntry(entry: AppMenuEntry): MenuEntry | null {
    if (!isVisible(entry)) return null
    if (isSeparator(entry)) return { separator: true }

    if (entry.id === 'language') {
      return { label: menuLabel(entry), sub: languageMenu }
    }

    if (entry.id === 'selection.moveToPage') {
      if (otherPages.length === 0) return null
      const disabled = !commands['selection.moveToPage'].enabled
      return {
        label: menuLabel(entry),
        disabled,
        sub: otherPages.map((page) => ({
          label: page.name,
          disabled,
          action: () => moveSelectionToPage(page.id)
        }))
      }
    }

    if (entry.command) {
      return commandMenuItem(entry.command, appMenuShortcutLabel(entry.id))
    }

    return {
      label: menuLabel(entry),
      shortcut: appMenuShortcutLabel(entry.id),
      action: itemAction(entry),
      checked: checked(entry),
      onCheckedChange: onCheckedChange(entry),
      sub: entry.sub?.map(buildEntry).filter((item): item is MenuEntry => item !== null)
    }
  }

  function groupLabel(group: AppMenuGroupSchema): string {
    const key = group.label.toLowerCase() as keyof typeof menu
    return menu[key] ?? group.label
  }

  function buildGroup(group: AppMenuGroupSchema): AppMenuGroup | null {
    if (!isVisible(group)) return null
    return {
      label: groupLabel(group),
      items: group.items.map(buildEntry).filter((item): item is MenuEntry => item !== null)
    }
  }

  const topMenus = APP_MENU_SCHEMA.map(buildGroup).filter(
    (group): group is AppMenuGroup => group !== null
  )

  return { topMenus }
}
