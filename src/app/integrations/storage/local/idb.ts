import {
  bytesToBuffer,
  openIdbStores,
  readIdbBlob,
  reqToPromise,
  txDone
} from '@/app/storage/idb-util'

import type {
  StorageAdapter,
  StorageDocument,
  StorageDocumentMetadata,
  StorageTransferProgress
} from '../types'

const DB_NAME = 'openweave-local-workspace'
const DB_VERSION = 1

const STORE_META = 'meta'
const STORE_FIG = 'fig'
const STORE_THUMB = 'thumb'

type LocalMetaRow = StorageDocumentMetadata & { id: string }

function openDb(): Promise<IDBDatabase> {
  return openIdbStores(DB_NAME, DB_VERSION, [
    { name: STORE_META, keyPath: 'id' },
    { name: STORE_FIG },
    { name: STORE_THUMB }
  ])
}

function reportComplete(
  onProgress: ((progress: StorageTransferProgress) => void) | undefined,
  totalBytes: number
): void {
  onProgress?.({ transferredBytes: totalBytes, totalBytes })
}

let persistRequest: Promise<boolean> | null = null

/** Ask the browser to exempt this origin's storage from eviction (best effort, cached). */
function requestDurableStorage(): Promise<boolean> {
  if (!persistRequest) {
    persistRequest = (async () => {
      try {
        return (await navigator.storage?.persist?.()) ?? false
      } catch {
        return false
      }
    })()
  }
  return persistRequest
}

/**
 * Browser backend of the local-device storage provider: documents live in
 * IndexedDB, which survives browser restarts. Persistent-storage permission is
 * requested so the browser will not evict them under storage pressure.
 */
export function createIdbLocalDeviceStorageAdapter(): StorageAdapter {
  let dbPromise: Promise<IDBDatabase> | null = null

  function db() {
    if (!dbPromise) dbPromise = openDb()
    return dbPromise
  }

  void requestDurableStorage()

  return {
    async testConnection() {
      try {
        await db()
      } catch (error) {
        return {
          ok: false,
          message: `Browser storage is unavailable: ${
            error instanceof Error ? error.message : String(error)
          }`
        }
      }
      const durable = await requestDurableStorage()
      return {
        ok: true,
        message: durable
          ? 'Documents are stored in this browser and survive restarts (persistent storage granted).'
          : 'Documents are stored in this browser and survive restarts. The browser may still clear site data under storage pressure — use the desktop app to keep documents as files on disk.'
      }
    },

    async listDocuments() {
      const database = await db()
      const tx = database.transaction(STORE_META, 'readonly')
      const rows = (await reqToPromise(tx.objectStore(STORE_META).getAll())) as LocalMetaRow[]
      await txDone(tx)
      return rows
        .map(
          (row) =>
            ({
              id: row.id,
              name: row.name,
              updatedAt: row.updatedAt,
              metadataAuthoritative: true
            }) satisfies StorageDocument
        )
        .sort((first, second) => second.updatedAt.localeCompare(first.updatedAt))
    },

    async getDocument(id, onProgress) {
      const bytes = await readIdbBlob(await db(), STORE_FIG, id)
      if (!bytes) throw new Error(`Document not found: ${id}`)
      reportComplete(onProgress, bytes.byteLength)
      return bytes
    },

    async putDocument(id, bytes, metadata, onProgress) {
      const database = await db()
      const tx = database.transaction([STORE_META, STORE_FIG], 'readwrite')
      tx.objectStore(STORE_FIG).put(bytesToBuffer(bytes), id)
      tx.objectStore(STORE_META).put({
        id,
        name: metadata.name,
        updatedAt: metadata.updatedAt || new Date().toISOString()
      } satisfies LocalMetaRow)
      await txDone(tx)
      reportComplete(onProgress, bytes.byteLength)
    },

    async getDocumentMetadata(id) {
      const database = await db()
      const tx = database.transaction(STORE_META, 'readonly')
      const row = (await reqToPromise(tx.objectStore(STORE_META).get(id))) as
        | LocalMetaRow
        | undefined
      await txDone(tx)
      return row ? { name: row.name, updatedAt: row.updatedAt } : null
    },

    async deleteDocument(id) {
      const database = await db()
      const tx = database.transaction([STORE_META, STORE_FIG, STORE_THUMB], 'readwrite')
      for (const store of [STORE_META, STORE_FIG, STORE_THUMB]) tx.objectStore(store).delete(id)
      await txDone(tx)
    },

    async getUsage() {
      const database = await db()
      const tx = database.transaction([STORE_META, STORE_FIG, STORE_THUMB], 'readonly')
      const figs = await reqToPromise(tx.objectStore(STORE_FIG).getAll())
      const thumbs = await reqToPromise(tx.objectStore(STORE_THUMB).getAll())
      const documentCount = await reqToPromise(tx.objectStore(STORE_META).count())
      await txDone(tx)
      const blobs = figs.concat(thumbs) as Array<ArrayBuffer | Uint8Array | Blob>
      return {
        bytesUsed: blobs.reduce(
          (total, blob) => total + ('size' in blob ? blob.size : blob.byteLength),
          0
        ),
        objectCount: figs.length + thumbs.length + documentCount,
        documentCount
      }
    },

    async putThumbnail(id, bytes) {
      const database = await db()
      const tx = database.transaction(STORE_THUMB, 'readwrite')
      tx.objectStore(STORE_THUMB).put(bytesToBuffer(bytes), id)
      await txDone(tx)
    },

    async getThumbnail(id) {
      return readIdbBlob(await db(), STORE_THUMB, id)
    }
  }
}
