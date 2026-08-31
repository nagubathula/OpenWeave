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

function entryPath(id: string, suffix: string): string {
  return `${STORAGE_DIR}/${entryName(id, suffix)}`
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

async function fsApi() {
  const fs = await import('@tauri-apps/plugin-fs')
  return { fs, baseDir: fs.BaseDirectory.AppLocalData }
}

function reportComplete(
  onProgress: ((progress: StorageTransferProgress) => void) | undefined,
  totalBytes: number
): void {
  onProgress?.({ transferredBytes: totalBytes, totalBytes })
}

/**
 * Desktop (Tauri) backend of the local-device storage provider: documents are
 * plain files under the app-data directory, so they persist independently of
 * any webview or browser profile state.
 */
export function createFsLocalDeviceStorageAdapter(): StorageAdapter {
  async function ensureDir() {
    const api = await fsApi()
    await api.fs.mkdir(STORAGE_DIR, { baseDir: api.baseDir, recursive: true })
    return api
  }

  async function readEntry(id: string, suffix: string): Promise<Uint8Array | null> {
    const { fs, baseDir } = await fsApi()
    try {
      return await fs.readFile(entryPath(id, suffix), { baseDir })
    } catch {
      return null
    }
  }

  async function listDocumentIds(): Promise<string[]> {
    const { fs, baseDir } = await fsApi()
    const entries = await fs.readDir(STORAGE_DIR, { baseDir }).catch(() => [])
    return entries
      .filter((entry) => entry.isFile)
      .map((entry) => documentIdFromEntryName(entry.name))
      .filter((id): id is string => id !== null)
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
      const dir = await import('@tauri-apps/api/path')
        .then((path) => path.appLocalDataDir())
        .catch(() => null)
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
      const { fs, baseDir } = await ensureDir()
      await fs.writeFile(entryPath(id, FIG_SUFFIX), bytes, { baseDir })
      await fs.writeFile(
        entryPath(id, META_SUFFIX),
        new TextEncoder().encode(encodeStoredMetadata(metadata)),
        { baseDir }
      )
      reportComplete(onProgress, bytes.byteLength)
    },

    async getDocumentMetadata(id) {
      return authoritativeStoredMetadata(await readEntry(id, META_SUFFIX), id)
    },

    async deleteDocument(id) {
      const { fs, baseDir } = await fsApi()
      for (const suffix of [FIG_SUFFIX, META_SUFFIX, THUMB_SUFFIX]) {
        const path = entryPath(id, suffix)
        if (await fs.exists(path, { baseDir })) await fs.remove(path, { baseDir })
      }
    },

    async getUsage() {
      const { fs, baseDir } = await fsApi()
      const entries = await fs.readDir(STORAGE_DIR, { baseDir }).catch(() => [])
      const files = entries.filter((entry) => entry.isFile)
      const sizes = await Promise.all(
        files.map((entry) =>
          fs
            .stat(`${STORAGE_DIR}/${entry.name}`, { baseDir })
            .then((info) => info.size)
            .catch(() => 0)
        )
      )
      return {
        bytesUsed: sizes.reduce((total, size) => total + size, 0),
        objectCount: files.length,
        documentCount: files.filter((entry) => documentIdFromEntryName(entry.name) !== null).length
      } satisfies StorageUsage
    },

    async putThumbnail(id, bytes) {
      const { fs, baseDir } = await ensureDir()
      await fs.writeFile(entryPath(id, THUMB_SUFFIX), bytes, { baseDir })
    },

    async getThumbnail(id) {
      return readEntry(id, THUMB_SUFFIX)
    }
  }
}
