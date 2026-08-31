import { isTauri } from '@/app/tauri/env'

import type { StorageAdapter } from '../types'
import { createFsLocalDeviceStorageAdapter } from './fs'
import { createIdbLocalDeviceStorageAdapter } from './idb'

/**
 * Storage adapter that keeps documents on this device — real files under the
 * app-data directory in the desktop app, persistent IndexedDB in the browser.
 * Acts as the "remote" side of the sync engine, so the local-first mirror,
 * outbox, and workspace UI work unchanged without any cloud account.
 */
export function createLocalDeviceStorageAdapter(): StorageAdapter {
  return isTauri() ? createFsLocalDeviceStorageAdapter() : createIdbLocalDeviceStorageAdapter()
}
