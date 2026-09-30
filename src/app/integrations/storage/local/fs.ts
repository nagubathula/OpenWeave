import { authoritativeStoredMetadata, encodeStoredMetadata, parseStoredMetadata } from '../metadata'
import type {
  StorageAdapter,
  StorageDocument,
  StorageTransferProgress,
  StorageUsage
} from '../types'

/** Relative to the app-local-data directory. */
const STORAGE_DIR = 'storage/local/v1'

const FIG_SUFFIX = '.fig'
const META_SUFFIX = '.meta.json'
const THUMB_SUFFIX = '.thumb.jpg'

function entryName(id: string, suffix: string): string {
  return `${encodeURIComponent(id)}${suffix}`
}

function documentIdFromEntryName(name: string): string | null {
  if (!name.endsWith(FIG_SUFFIX)) return null
  const encoded = name.slice(0, -FIG_SUFFIX.length)
  if (!encoded) return null
  try {
    return decodeURIComponent(encoded)
  } catch {
    return null
  }
}

function getElectron() {
  if (typeof window !== 'undefined' && (window as any).electron) {
    return (window as any).electron
  }
  return null
}

async function getStorageDir(): Promise<string> {
  const electron = getElectron()
  if (electron?.app?.getPath) {
    const userData = await electron.app.getPath('userData')
    if (electron.path?.join) {
      return await electron.path.join(userData, 'storage', 'local', 'v1')
    }
    return `${userData}/storage/local/v1`
  }
  return STORAGE_DIR
}

async function entryPath(id: string, suffix: string): Promise<string> {
  const dir = await getStorageDir()
  const electron = getElectron()
  if (electron?.path?.join) {
    return await electron.path.join(dir, entryName(id, suffix))
  }
  return `${dir}/${entryName(id, suffix)}`
}

function reportComplete(
  onProgress: ((progress: StorageTransferProgress) => void) | undefined,
  totalBytes: number
): void {
  onProgress?.({ transferredBytes: totalBytes, totalBytes })
}

/**
 * Desktop backend of the local-device storage provider: documents are
 * plain files under the app-data directory, so they persist independently of
 * any webview or browser profile state.
 */
export function createFsLocalDeviceStorageAdapter(): StorageAdapter {
  async function ensureDir() {
    const electron = getElectron()
    if (electron?.fs) {
      const dir = await getStorageDir()
      await electron.fs.mkdir(dir, { recursive: true })
    }
  }

  async function readEntry(id: string, suffix: string): Promise<Uint8Array | null> {
    const electron = getElectron()
    if (!electron?.fs) return null
    try {
      const path = await entryPath(id, suffix)
      return await electron.fs.readFile(path)
    } catch {
      return null
    }
  }

  async function listDocumentIds(): Promise<string[]> {
    const electron = getElectron()
    if (!electron?.fs) return []
    const dir = await getStorageDir()
    const entries = await electron.fs.readDir(dir).catch(() => [])
    return entries
      .filter((entry: any) => entry.isFile ?? !entry.isDirectory)
      .map((entry: any) => documentIdFromEntryName(entry.name))
      .filter((id: any): id is string => id !== null)
  }

  return {
    async testConnection() {
      try {
        await ensureDir()
      } catch (error) {
        return {
          ok: false,
          message: `App storage is unavailable: ${
            error instanceof Error ? error.message : String(error)
          }`
        }
      }
      const dir = await getStorageDir()
      return {
        ok: true,
        message: dir
          ? `Documents are stored as files under ${dir}.`
          : 'Documents are stored as files in the app data directory.'
      }
    },

    async listDocuments() {
      const ids = await listDocumentIds()
      const documents = await Promise.all(
        ids.map(async (id) => {
          const fallback = { name: id, updatedAt: new Date(0).toISOString() }
          const { metadata, authoritative } = parseStoredMetadata(
            await readEntry(id, META_SUFFIX),
            fallback
          )
          return {
            id,
            ...metadata,
            metadataAuthoritative: authoritative
          } satisfies StorageDocument
        })
      )
      return documents.sort((first, second) => second.updatedAt.localeCompare(first.updatedAt))
    },

    async getDocument(id, onProgress) {
      const bytes = await readEntry(id, FIG_SUFFIX)
      if (!bytes) throw new Error(`Document not found: ${id}`)
      reportComplete(onProgress, bytes.byteLength)
      return bytes
    },

    async putDocument(id, bytes, metadata, onProgress) {
      await ensureDir()
      const electron = getElectron()
      if (!electron?.fs) throw new Error('Desktop filesystem unavailable')
      const figPath = await entryPath(id, FIG_SUFFIX)
      const metaPath = await entryPath(id, META_SUFFIX)
      await electron.fs.writeFile(figPath, bytes)
      await electron.fs.writeFile(
        metaPath,
        new TextEncoder().encode(encodeStoredMetadata(metadata))
      )
      reportComplete(onProgress, bytes.byteLength)
    },

    async getDocumentMetadata(id) {
      return authoritativeStoredMetadata(await readEntry(id, META_SUFFIX), id)
    },

    async deleteDocument(id) {
      const electron = getElectron()
      if (!electron?.fs) return
      for (const suffix of [FIG_SUFFIX, META_SUFFIX, THUMB_SUFFIX]) {
        const path = await entryPath(id, suffix)
        if (await electron.fs.exists(path)) await electron.fs.remove(path)
      }
    },

    async getUsage() {
      const electron = getElectron()
      if (!electron?.fs) {
        return { bytesUsed: 0, objectCount: 0, documentCount: 0 }
      }
      const dir = await getStorageDir()
      const entries = await electron.fs.readDir(dir).catch(() => [])
      const files = entries.filter((entry: any) => entry.isFile ?? !entry.isDirectory)
      const sizes = await Promise.all(
        files.map(async (entry: any) => {
          const filePath = electron.path?.join
            ? await electron.path.join(dir, entry.name)
            : `${dir}/${entry.name}`
          return electron.fs
            .stat(filePath)
            .then((info: any) => info?.size ?? 0)
            .catch(() => 0)
        })
      )
      return {
        bytesUsed: sizes.reduce((total: number, size: number) => total + size, 0),
        objectCount: files.length,
        documentCount: files.filter((entry: any) => documentIdFromEntryName(entry.name) !== null)
          .length
      } satisfies StorageUsage
    },

    async putThumbnail(id, bytes) {
      await ensureDir()
      const electron = getElectron()
      if (electron?.fs) {
        const thumbPath = await entryPath(id, THUMB_SUFFIX)
        await electron.fs.writeFile(thumbPath, bytes)
      }
    },

    async getThumbnail(id) {
      return readEntry(id, THUMB_SUFFIX)
    }
  }
}
