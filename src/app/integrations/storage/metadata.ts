import type { StorageDocumentMetadata } from './types'

/** Parse a `.meta.json` sidecar, falling back field-by-field when absent or malformed. */
export function parseStoredMetadata(
  bytes: Uint8Array | null,
  fallback: StorageDocumentMetadata
): { metadata: StorageDocumentMetadata; authoritative: boolean } {
  if (!bytes) return { metadata: fallback, authoritative: false }
  try {
    const parsed = JSON.parse(new TextDecoder().decode(bytes)) as Partial<StorageDocumentMetadata>
    const name = typeof parsed.name === 'string' && parsed.name.trim() ? parsed.name : null
    const updatedAt =
      typeof parsed.updatedAt === 'string' && parsed.updatedAt ? parsed.updatedAt : null
    return {
      metadata: {
        name: name ?? fallback.name,
        updatedAt: updatedAt ?? fallback.updatedAt
      },
      authoritative: name !== null && updatedAt !== null
    }
  } catch {
    return { metadata: fallback, authoritative: false }
  }
}

/** Metadata from a `.meta.json` sidecar, or null when it is absent or incomplete. */
export function authoritativeStoredMetadata(
  bytes: Uint8Array | null,
  id: string
): StorageDocumentMetadata | null {
  if (!bytes) return null
  const parsed = parseStoredMetadata(bytes, { name: id, updatedAt: new Date(0).toISOString() })
  return parsed.authoritative ? parsed.metadata : null
}

export function encodeStoredMetadata(metadata: StorageDocumentMetadata): string {
  return JSON.stringify({
    name: metadata.name,
    updatedAt: metadata.updatedAt || new Date().toISOString()
  })
}
