import { getDesktopBridge } from '@/app/desktop/env'
import type { DesktopBridge } from '@/app/desktop/types'

const APP_CACHE_DIR = 'cache/v1'
const STORAGE_PREFIX = 'openweave:cache:v1:'

const textEncoder = new TextEncoder()
const textDecoder = new TextDecoder()

function isStorageAvailable() {
  return 'window' in globalThis && !!window.localStorage
}

function storageKey(key: string) {
  return `${STORAGE_PREFIX}${key}`
}

function cacheSegments(key: string) {
  return [APP_CACHE_DIR, ...key.split('/').map(encodeURIComponent)]
}

/**
 * Desktop cache files live under Electron `userData/cache/v1`. Paths are
 * resolved absolutely so the cache never lands in the process working directory.
 */
async function desktopCachePath(
  key: string
): Promise<{ fs: DesktopBridge['fs']; path: string } | null> {
  const desktop = getDesktopBridge()
  if (!desktop) return null
  const root = await desktop.app.getPath('userData')
  return { fs: desktop.fs, path: await desktop.path.join(root, ...cacheSegments(key)) }
}

async function writeDesktopFile(key: string, data: Uint8Array): Promise<boolean> {
  const target = await desktopCachePath(key).catch(() => null)
  if (!target) return false
  try {
    const separator = Math.max(target.path.lastIndexOf('/'), target.path.lastIndexOf('\\'))
    await target.fs.mkdir(target.path.slice(0, separator), { recursive: true })
    await target.fs.writeFile(target.path, data)
    return true
  } catch (error) {
    console.warn(`Cache write failed for "${key}":`, error)
    return false
  }
}

async function readDesktopFile(key: string): Promise<Uint8Array | null> {
  const target = await desktopCachePath(key).catch(() => null)
  if (!target) return null
  try {
    return await target.fs.readFile(target.path)
  } catch {
    return null
  }
}

async function removeDesktopPath(key: string, recursive: boolean) {
  const target = await desktopCachePath(key).catch(() => null)
  if (!target) return
  try {
    await target.fs.remove(target.path, { recursive })
  } catch (error) {
    console.warn(`Cache delete skipped for "${key}":`, error)
  }
}

export async function readCacheText(key: string): Promise<string | null> {
  const data = await readDesktopFile(key)
  if (data) return textDecoder.decode(data)
  if (!isStorageAvailable()) return null
  return window.localStorage.getItem(storageKey(key))
}

export async function writeCacheText(key: string, value: string): Promise<void> {
  const written = await writeDesktopFile(key, textEncoder.encode(value))
  if (written || !isStorageAvailable()) return
  window.localStorage.setItem(storageKey(key), value)
}

export async function removeCacheEntry(key: string): Promise<void> {
  await removeDesktopPath(key, false)
  if (!isStorageAvailable()) return
  window.localStorage.removeItem(storageKey(key))
}

export async function readCacheBytes(key: string): Promise<ArrayBuffer | null> {
  const data = await readDesktopFile(key)
  if (!data) return null
  const copy = new Uint8Array(data.byteLength)
  copy.set(data)
  return copy.buffer
}

export async function writeCacheBytes(key: string, value: ArrayBuffer): Promise<void> {
  await writeDesktopFile(key, new Uint8Array(value))
}

export async function removeCachePrefix(prefix: string): Promise<void> {
  await removeDesktopPath(prefix, true)
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
