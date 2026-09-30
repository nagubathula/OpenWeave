const APP_CACHE_DIR = 'cache/v1'
const STORAGE_PREFIX = 'openweave:cache:v1:'

const textEncoder = new TextEncoder()
const textDecoder = new TextDecoder()

function isStorageAvailable() {
  return 'window' in globalThis && !!window.localStorage
}

function cachePath(key: string) {
  return `${APP_CACHE_DIR}/${key.split('/').map(encodeURIComponent).join('/')}`
}

function storageKey(key: string) {
  return `${STORAGE_PREFIX}${key}`
}

interface ElectronFs {
  readFile?: (path: string) => Promise<Uint8Array>
  writeFile?: (path: string, data: Uint8Array) => Promise<void>
  mkdir?: (path: string, options?: { recursive?: boolean }) => Promise<void>
  remove?: (path: string, options?: { recursive?: boolean }) => Promise<void>
}

function getElectronFs(): ElectronFs | null {
  if (typeof window === 'undefined') return null
  const win = window as unknown as {
    electron?: { fs?: ElectronFs }
    electronAPI?: { fs?: ElectronFs }
  }
  return win.electron?.fs ?? win.electronAPI?.fs ?? null
}

async function writeElectronFile(filePath: string, data: Uint8Array): Promise<boolean> {
  const fs = getElectronFs()
  if (!fs?.writeFile) return false
  try {
    if (fs.mkdir) await fs.mkdir(APP_CACHE_DIR, { recursive: true })
    await fs.writeFile(filePath, data)
    return true
  } catch (error) {
    console.warn(`Cache write failed for "${filePath}":`, error)
    return false
  }
}

export async function readCacheText(key: string): Promise<string | null> {
  const fs = getElectronFs()
  if (fs?.readFile) {
    try {
      const data = await fs.readFile(cachePath(key))
      return textDecoder.decode(data)
    } catch {
      // Fall through to localStorage
    }
  }

  if (!isStorageAvailable()) return null
  return window.localStorage.getItem(storageKey(key))
}

export async function writeCacheText(key: string, value: string): Promise<void> {
  const written = await writeElectronFile(cachePath(key), textEncoder.encode(value))
  if (written || !isStorageAvailable()) return
  window.localStorage.setItem(storageKey(key), value)
}

export async function removeCacheEntry(key: string): Promise<void> {
  const fs = getElectronFs()
  if (fs?.remove) {
    try {
      await fs.remove(cachePath(key))
    } catch (error) {
      console.warn(`Cache delete skipped for "${key}":`, error)
    }
  }

  if (!isStorageAvailable()) return
  window.localStorage.removeItem(storageKey(key))
}

export async function readCacheBytes(key: string): Promise<ArrayBuffer | null> {
  const fs = getElectronFs()
  if (fs?.readFile) {
    try {
      const data = await fs.readFile(cachePath(key))
      const copy = new Uint8Array(data.byteLength)
      copy.set(data)
      return copy.buffer
    } catch {
      return null
    }
  }
  return null
}

export async function writeCacheBytes(key: string, value: ArrayBuffer): Promise<void> {
  await writeElectronFile(cachePath(key), new Uint8Array(value))
}

export async function removeCachePrefix(prefix: string): Promise<void> {
  const fs = getElectronFs()
  if (fs?.remove) {
    try {
      await fs.remove(cachePath(prefix), { recursive: true })
    } catch (error) {
      console.warn(`Cache prefix delete skipped for "${prefix}":`, error)
    }
  }

  if (!isStorageAvailable()) return
  for (let i = window.localStorage.length - 1; i >= 0; i--) {
    const key = window.localStorage.key(i)
    if (key?.startsWith(storageKey(prefix))) window.localStorage.removeItem(key)
  }
}

type JsonCacheEnvelope<T> = {
  updatedAt: number
  value: T
}

export async function readCacheJson<T>(key: string, maxAgeMs?: number): Promise<T | null> {
  const raw = await readCacheText(key)
  if (!raw) return null

  try {
    const envelope = JSON.parse(raw) as Partial<JsonCacheEnvelope<T>>
    if (typeof envelope.updatedAt !== 'number' || !('value' in envelope)) return null
    if (maxAgeMs !== undefined && Date.now() - envelope.updatedAt > maxAgeMs) return null
    return envelope.value as T
  } catch {
    return null
  }
}

export async function writeCacheJson(key: string, value: unknown): Promise<void> {
  await writeCacheText(key, JSON.stringify({ updatedAt: Date.now(), value }))
}
