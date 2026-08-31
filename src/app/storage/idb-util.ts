/** Shared IndexedDB plumbing for the local canvas store and the sync outbox. */

export function openIdb(
  name: string,
  version: number,
  upgrade: (db: IDBDatabase) => void
): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not available'))
      return
    }
    const req = indexedDB.open(name, version)
    req.onerror = () => reject(req.error ?? new Error(`Failed to open ${name}`))
    req.onblocked = () => reject(new Error(`Opening ${name} blocked by another tab's connection`))
    req.onsuccess = () => resolve(req.result)
    req.onupgradeneeded = () => upgrade(req.result)
  })
}

export function openIdbStores(
  name: string,
  version: number,
  stores: ReadonlyArray<{ name: string; keyPath?: string }>
): Promise<IDBDatabase> {
  return openIdb(name, version, (db) => {
    for (const store of stores) {
      if (!db.objectStoreNames.contains(store.name)) {
        db.createObjectStore(store.name, store.keyPath ? { keyPath: store.keyPath } : undefined)
      }
    }
  })
}

/** Stored rows may be ArrayBuffer, typed array, or Blob depending on writer/browser. */
export async function rowToBytes(row: unknown): Promise<Uint8Array | null> {
  if (row == null) return null
  if (row instanceof ArrayBuffer) return new Uint8Array(row)
  if (row instanceof Uint8Array) return new Uint8Array(row)
  if (row instanceof Blob) return new Uint8Array(await row.arrayBuffer())
  return null
}

export function bytesToBuffer(bytes: Uint8Array) {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
}

/** Single-key blob read in its own read transaction. */
export async function readIdbBlob(
  database: IDBDatabase,
  storeName: string,
  id: string
): Promise<Uint8Array | null> {
  const tx = database.transaction(storeName, 'readonly')
  const row = await reqToPromise(tx.objectStore(storeName).get(id))
  await txDone(tx)
  return rowToBytes(row)
}

export function reqToPromise<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error ?? new Error('IndexedDB request failed'))
  })
}

export function txDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error ?? new Error('IndexedDB transaction failed'))
    tx.onabort = () => reject(tx.error ?? new Error('IndexedDB transaction aborted'))
  })
}
