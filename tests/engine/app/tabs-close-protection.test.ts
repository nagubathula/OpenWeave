import { beforeEach, describe, expect, test } from 'bun:test'

import {
  allTabs,
  closeTab,
  createTab,
  getTabsSnapshot,
  pendingCloseTabAtom,
  reopenLastClosedTab
} from '@/app/tabs'

describe('Tabs Close Protection & Recovery', () => {
  beforeEach(() => {
    // Reset tabs
    for (const tab of getTabsSnapshot()) {
      closeTab(tab.id, { force: true })
    }
    pendingCloseTabAtom.set(null)
  })

  test('detects untouched document as not dirty and closes immediately', () => {
    const tab = createTab()
    expect(tab.store.isDocumentDirty()).toBe(false)

    closeTab(tab.id)
    expect(pendingCloseTabAtom.get()).toBeNull()
  })

  test('intercepts closing dirty tab and populates pendingCloseTabAtom', () => {
    const tab = createTab()

    // Add a rectangle to make document dirty
    tab.store.createShape('RECTANGLE', 50, 50, 100, 100)
    expect(tab.store.isDocumentDirty()).toBe(true)

    closeTab(tab.id)

    // Tab should NOT be closed yet
    const pending = pendingCloseTabAtom.get()
    expect(pending).not.toBeNull()
    expect(pending?.tabId).toBe(tab.id)
    expect(pending?.name).toBe('Untitled')

    // Force close should bypass the check
    closeTab(tab.id, { force: true })
    expect(getTabsSnapshot().some((t) => t.id === tab.id)).toBe(false)
  })

  test('reopenLastClosedTab handles history stack', async () => {
    // When history is empty
    const emptyReopen = await reopenLastClosedTab()
    expect(emptyReopen).toBe(false)

    // Create a tab with planned file path and close it
    const tab = createTab()
    const testPath = '/path/to/my-design.fig'
    tab.store.setPlannedFilePath(testPath)

    closeTab(tab.id, { force: true })

    // Reopen attempts to open the file from the popped history
    const reopened = await reopenLastClosedTab()
    expect(reopened).toBe(true)

    // Second reopen should be empty
    const emptyAgain = await reopenLastClosedTab()
    expect(emptyAgain).toBe(false)
  })
})
