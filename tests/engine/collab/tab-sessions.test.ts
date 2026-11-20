import { beforeEach, describe, expect, test } from 'bun:test'

import {
  activeCollab,
  collabForStore,
  collabForTab,
  sharedTabIds,
  tabForJoin,
  type CollabSession
} from '@/app/collab/tabs'
import { closeTab, createTab, getTabsSnapshot, switchTab } from '@/app/tabs'

/** Marks a session as in a room without opening a transport (no network in tests). */
function enterRoom(session: CollabSession, roomId: string) {
  session.state.set({ ...session.state.get(), connected: true, roomId })
}

describe('per-tab collaboration sessions', () => {
  beforeEach(() => {
    for (const tab of getTabsSnapshot()) closeTab(tab.id, { force: true })
  })

  test('each tab gets its own session, and the active one follows tab switches', () => {
    const first = createTab()
    const second = createTab()

    const firstSession = collabForTab(first)
    expect(collabForTab(first)).toBe(firstSession)
    expect(collabForTab(second)).not.toBe(firstSession)
    expect(collabForStore(second.store)).toBe(collabForTab(second))

    expect(activeCollab.get()).toBe(collabForTab(second))
    switchTab(first.id)
    expect(activeCollab.get()).toBe(firstSession)
  })

  test('two files can be in rooms at the same time', () => {
    const first = createTab()
    const second = createTab()
    enterRoom(collabForTab(first), 'room-a')
    enterRoom(collabForTab(second), 'room-b')

    expect([...sharedTabIds.get()].sort()).toEqual([first.id, second.id].sort())
    expect(collabForTab(first).state.get().roomId).toBe('room-a')
  })

  test('joining reuses a blank tab but never one that is already in a room', () => {
    const blank = createTab()
    expect(tabForJoin().id).toBe(blank.id)

    enterRoom(collabForTab(blank), 'room-a')
    const joined = tabForJoin()
    expect(joined.id).not.toBe(blank.id)
    expect(getTabsSnapshot().map((tab) => tab.id)).toContain(joined.id)
  })

  test('closing a shared tab leaves its room and clears its shared state', () => {
    const shared = createTab()
    const other = createTab()
    enterRoom(collabForTab(shared), 'room-a')
    enterRoom(collabForTab(other), 'room-b')

    closeTab(shared.id, { force: true })

    expect(sharedTabIds.get().has(shared.id)).toBe(false)
    expect(sharedTabIds.get().has(other.id)).toBe(true)
    expect(collabForStore(shared.store)).toBeNull()
  })
})
