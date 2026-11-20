import { atom, computed } from 'nanostores'

import { stopLocalShare } from '@/app/collab/local-share'
import { stopShareTunnel } from '@/app/collab/tunnel'
import { useCollab } from '@/app/collab/use'
import type { EditorStore } from '@/app/editor/session'
import { closeHome } from '@/app/home/store'
import {
  activeTab,
  allTabs,
  createTab,
  getTabForStore,
  openNewDesignTab,
  type Tab
} from '@/app/tabs'

/**
 * One collaboration session per tab, so several open files can be shared at
 * once. Each session owns its room; the desktop share server, ngrok tunnel and
 * LAN listener are shared by every room (links differ only by `?room=`).
 */

export type CollabSession = ReturnType<typeof useCollab>

const sessions = new Map<string, { session: CollabSession; unlisten: () => void }>()

/** Ids of tabs whose file is currently in a collaboration room. */
export const sharedTabIds = atom<ReadonlySet<string>>(new Set())

function refreshSharedTabs() {
  const shared = new Set<string>()
  for (const [tabId, { session }] of sessions) {
    if (session.state.get().roomId) shared.add(tabId)
  }
  sharedTabIds.set(shared)
}

export function collabForTab(tab: Tab): CollabSession {
  const existing = sessions.get(tab.id)
  if (existing) return existing.session
  const session = useCollab(() => tab.store)
  const unlisten = session.state.listen(refreshSharedTabs)
  sessions.set(tab.id, { session, unlisten })
  return session
}

/** The session of the tab showing `store`, if that tab has one. */
export function collabForStore(store: EditorStore): CollabSession | null {
  const tab = getTabForStore(store)
  return tab ? (sessions.get(tab.id)?.session ?? null) : null
}

export const activeCollab = computed(activeTab, (tab) => (tab ? collabForTab(tab) : null))

function anyRoomOpen(): boolean {
  return [...sessions.values()].some(({ session }) => session.state.get().roomId)
}

/** Leaves one tab's room; stops the shared tunnel and LAN link after the last room. */
export function leaveRoom(session: CollabSession): void {
  session.disconnect()
  if (anyRoomOpen()) return
  void stopShareTunnel()
  void stopLocalShare()
}

/**
 * Tab to join a room in: the blank startup tab when there is one, otherwise a
 * new tab, so joining never replaces a document or another room.
 */
export function tabForJoin(): Tab {
  const current = activeTab.get()
  if (current && !collabForTab(current).state.get().roomId) return openNewDesignTab()
  const tab = createTab()
  closeHome()
  return tab
}

export interface PendingRoom {
  roomId: string
  isProtected: boolean
}

let pendingRoomTaken = false

/**
 * The room a share link (`/share?room=…`) asks to join, returned once per page
 * load. Later reads get `null`: the share panel remounts on every tab switch,
 * and the URL keeps the last shared room, which must not prompt again.
 */
export function takePendingRoomFromUrl(): PendingRoom | null {
  if (pendingRoomTaken || typeof window === 'undefined') return null
  pendingRoomTaken = true
  const params = new URLSearchParams(window.location.search)
  const roomId = params.get('room')
  if (!roomId) return null
  return { roomId, isProtected: params.has('pwd') || params.get('protected') === '1' }
}

// A closed tab leaves its room and drops its session.
allTabs.listen((tabs) => {
  const open = new Set(tabs.map((tab) => tab.id))
  let closedAny = false
  for (const [tabId, { session, unlisten }] of sessions) {
    if (open.has(tabId)) continue
    sessions.delete(tabId)
    unlisten()
    if (session.state.get().roomId) {
      closedAny = true
      try {
        session.disconnect()
      } catch (error) {
        console.warn('Failed to leave the room of a closed tab', error)
      }
    }
  }
  if (!closedAny) return
  refreshSharedTabs()
  if (!anyRoomOpen()) {
    void stopShareTunnel()
    void stopLocalShare()
  }
})
