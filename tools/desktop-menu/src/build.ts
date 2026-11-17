import { editorCommandMetadata } from '@openweave/react'

import type { NativeMenuEntry, NativeMenuGroup } from '@/app/desktop/types'
import type { AppMenuEntry, AppMenuGroupSchema } from '@/app/shell/menu/schema'
import { shortcutTokenToAccelerator } from '@/app/shell/menu/shortcut'

function isNativeVisible(entry: { target?: string }): boolean {
  return entry.target !== 'browser'
}

function trimSeparators(entries: NativeMenuEntry[]): NativeMenuEntry[] {
  const out: NativeMenuEntry[] = []
  for (const entry of entries) {
    const previous = out.at(-1)
    if ('type' in entry && (!previous || 'type' in previous)) continue
    out.push(entry)
  }
  while (out.length > 0 && 'type' in (out.at(-1) ?? {})) out.pop()
  return out
}

function nativeEntry(entry: AppMenuEntry): NativeMenuEntry | null {
  if (!isNativeVisible(entry)) return null
  if (entry.type === 'separator') return { type: 'separator' }
  const shortcut =
    entry.shortcut ?? (entry.command ? editorCommandMetadata(entry.command).shortcut : undefined)
  const accelerator = entry.accelerator ?? shortcutTokenToAccelerator(shortcut)
  const sub = entry.sub ? nativeEntries(entry.sub) : undefined
  return {
    id: entry.id,
    label: entry.label,
    ...(accelerator ? { accelerator } : {}),
    ...(entry.checkbox ? { checkbox: true } : {}),
    ...(sub?.length ? { sub } : {})
  }
}

function nativeEntries(entries: readonly AppMenuEntry[]): NativeMenuEntry[] {
  return trimSeparators(entries.map(nativeEntry).filter((entry) => entry !== null))
}

/**
 * Builds the native menu model from the shared `APP_MENU_SCHEMA` so browser and
 * desktop menus never drift; browser-only entries are dropped.
 */
export function buildNativeMenu(schema: readonly AppMenuGroupSchema[]): NativeMenuGroup[] {
  return schema
    .filter(isNativeVisible)
    .map((group) => ({ label: group.label, items: nativeEntries(group.items) }))
    .filter((group) => group.items.length > 0)
}
