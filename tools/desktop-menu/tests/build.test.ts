import { describe, expect, test } from 'bun:test'

import type { NativeMenuEntry } from '@/app/desktop/types'
import type { AppMenuGroupSchema } from '@/app/shell/menu/schema'
import { APP_MENU_SCHEMA } from '@/app/shell/menu/schema'

import { buildNativeMenu } from '../src/build'

function ids(entries: NativeMenuEntry[]): string[] {
  return entries.flatMap((entry) => ('type' in entry ? [] : [entry.id, ...ids(entry.sub ?? [])]))
}

describe('buildNativeMenu', () => {
  test('drops browser-only entries and keeps native-only ones', () => {
    const all = buildNativeMenu(APP_MENU_SCHEMA).flatMap((group) => ids(group.items))
    expect(all).not.toContain('language')
    expect(all).not.toContain('profiler')
    expect(all).toContain('dev-tools')
  })

  test('converts portable shortcuts to Electron accelerators', () => {
    const file = buildNativeMenu(APP_MENU_SCHEMA).find((group) => group.label === 'File')
    const saveAs = file?.items.find((entry) => !('type' in entry) && entry.id === 'save-as')
    expect(saveAs).toMatchObject({ accelerator: 'CmdOrCtrl+Shift+S' })
  })

  test('resolves accelerators for command-backed items', () => {
    const edit = buildNativeMenu(APP_MENU_SCHEMA).find((group) => group.label === 'Edit')
    const undo = edit?.items.find((entry) => !('type' in entry) && entry.id === 'edit.undo')
    expect(undo).toMatchObject({ accelerator: 'CmdOrCtrl+Z' })
  })

  test('collapses separators left dangling by removed entries', () => {
    const schema: AppMenuGroupSchema[] = [
      {
        label: 'View',
        items: [
          { type: 'separator' },
          { id: 'a', label: 'A' },
          { type: 'separator' },
          { id: 'b', label: 'B', target: 'browser' },
          { type: 'separator' },
          { id: 'c', label: 'C' },
          { type: 'separator' }
        ]
      },
      { label: 'Browser', target: 'browser', items: [{ id: 'x', label: 'X' }] }
    ]
    expect(buildNativeMenu(schema)).toEqual([
      {
        label: 'View',
        items: [{ id: 'a', label: 'A' }, { type: 'separator' }, { id: 'c', label: 'C' }]
      }
    ])
  })
})
