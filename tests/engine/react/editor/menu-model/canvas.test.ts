import { describe, expect, test } from 'bun:test'

import { buildCanvasContextMenu } from '#react/editor/menu-model/canvas'
import type { CanvasMenuOptions } from '#react/editor/menu-model/canvas'

import type { EditorCommandId } from '@openweave/react'

function selection(overrides: Partial<CanvasMenuOptions['selection']> = {}) {
  return {
    hasSelection: false,
    isGroup: false,
    isComponent: false,
    isInstance: false,
    canCreateComponentSet: false,
    ...overrides
  } as CanvasMenuOptions['selection']
}

function options(overrides: Partial<CanvasMenuOptions> = {}): CanvasMenuOptions {
  return {
    commandMenuItem(id: EditorCommandId) {
      return { id, label: id }
    },
    otherPages: [],
    moveSelectionToPage: (pageId: string) => pageId,
    selection: selection(),
    t: { moveToPage: 'Move to page' },
    ...overrides
  } as CanvasMenuOptions
}

function itemIds(menu: ReturnType<typeof buildCanvasContextMenu>) {
  return menu.map((item) => (item.separator ? '---' : (item.id ?? item.label)))
}

describe('buildCanvasContextMenu', () => {
  test('keeps the default selection menu in semantic groups', () => {
    expect(itemIds(buildCanvasContextMenu(options()))).toEqual([
      'selection.duplicate',
      'selection.delete',
      '---',
      'selection.bringForward',
      'selection.bringToFront',
      'selection.sendBackward',
      'selection.sendToBack',
      '---',
      'selection.group',
      'selection.frameSelection',
      'selection.wrapInAutoLayout',
      'selection.toggleMask',
      'selection.flatten',
      'selection.outlineText',
      'selection.outlineStroke',
      '---',
      'selection.createComponent',
      '---',
      'selection.toggleVisibility',
      'selection.toggleLock',
      '---',
      'selection.flipHorizontal',
      'selection.flipVertical'
    ])
  })

  test('shows instance actions only for instances', () => {
    expect(
      itemIds(buildCanvasContextMenu(options({ selection: selection({ isInstance: true }) })))
    ).toContain('selection.detachInstance')
  })

  test('does not emit empty leading or repeated separators', () => {
    const ids = itemIds(buildCanvasContextMenu(options({ otherPages: [] })))
    expect(ids[0]).not.toBe('---')
    expect(ids.at(-1)).not.toBe('---')
    expect(ids.join(',')).not.toContain('---,---')
  })
})
