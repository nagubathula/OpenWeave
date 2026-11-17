import { app, Menu, type BrowserWindow, type MenuItemConstructorOptions } from 'electron'

import type { NativeMenuEntry, NativeMenuGroup } from '../src/app/desktop/types'
import nativeMenu from './generated/menu.json'

/**
 * Native application menu built from `generated/menu.json`, which
 * `bun run generate:desktop-menu` derives from the shared
 * `src/app/shell/menu/schema.ts`.
 *
 * Accelerators are display-only (`registerAccelerator: false`): the renderer's
 * keyboard layer already binds every shortcut, exactly as in the browser, so
 * registering them natively would fire each command twice. Clipboard items use
 * Electron roles instead so native text fields keep working; the roles raise
 * DOM copy/cut/paste events that the editor's clipboard handlers consume.
 */

export const MENU_COMMAND_CHANNEL = 'menu:command'

const CLIPBOARD_ROLES: Partial<Record<string, MenuItemConstructorOptions['role']>> = {
  copy: 'copy',
  cut: 'cut',
  paste: 'paste'
}

function toTemplate(
  entry: NativeMenuEntry,
  getWindow: () => BrowserWindow | null
): MenuItemConstructorOptions {
  if ('type' in entry) return { type: 'separator' }
  const role = CLIPBOARD_ROLES[entry.id]
  if (role) return { role, label: entry.label, accelerator: entry.accelerator }
  if (entry.sub) {
    return { label: entry.label, submenu: entry.sub.map((sub) => toTemplate(sub, getWindow)) }
  }
  return {
    label: entry.label,
    accelerator: entry.accelerator,
    registerAccelerator: false,
    click: () => {
      const window = getWindow()
      if (!window) return
      if (entry.id === 'dev-tools') {
        window.webContents.toggleDevTools()
        return
      }
      window.webContents.send(MENU_COMMAND_CHANNEL, entry.id)
    }
  }
}

export function buildAppMenu(getWindow: () => BrowserWindow | null): Menu {
  const isMac = process.platform === 'darwin'
  const groups = (nativeMenu as NativeMenuGroup[]).map(
    (group): MenuItemConstructorOptions => ({
      label: group.label,
      submenu: group.items.map((entry) => toTemplate(entry, getWindow))
    })
  )
  const macAppMenu: MenuItemConstructorOptions = {
    label: app.name,
    submenu: [
      { role: 'about' },
      { type: 'separator' },
      { role: 'services' },
      { type: 'separator' },
      { role: 'hide' },
      { role: 'hideOthers' },
      { role: 'unhide' },
      { type: 'separator' },
      { role: 'quit' }
    ]
  }
  const template: MenuItemConstructorOptions[] = isMac
    ? [macAppMenu, ...groups, { role: 'windowMenu' }]
    : groups
  if (!isMac) {
    const file = template.find((group) => group.label === 'File')
    if (Array.isArray(file?.submenu)) file.submenu.push({ type: 'separator' }, { role: 'quit' })
  }
  return Menu.buildFromTemplate(template)
}
