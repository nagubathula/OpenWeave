import { atom, computed } from 'nanostores'

import type { SyncUiState } from '@/app/storage/sync/types'

/** Global subtle sync status for UI chips. */
export const syncUiState = atom<SyncUiState>('idle')
export const syncUiDetail = atom<string | null>(null)
export const pendingSyncCount = atom(0)

export const syncStatusLabel = computed([syncUiState, syncUiDetail], (state, detail) => {
  switch (state) {
    case 'syncing':
      return detail ?? 'Syncing…'
    case 'offline':
      return 'Offline · will sync'
    case 'error':
      return detail ?? 'Sync failed'
    default:
      return null
  }
})

export function setSyncUi(state: SyncUiState, detail: string | null = null) {
  syncUiState.set(state)
  syncUiDetail.set(detail)
}

export function setPendingSyncCount(count: number) {
  pendingSyncCount.set(count)
}
