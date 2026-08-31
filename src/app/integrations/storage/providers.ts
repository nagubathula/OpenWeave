import { createLocalDeviceStorageAdapter } from './local/adapter'
import { defineStorageProvider, StorageProviderRegistry } from './registry'
import { createS3StorageAdapter } from './s3/adapter'
import type { StorageProviderID, StorageProviderRegistration } from './types'

export const LOCAL_STORAGE_PROVIDER = defineStorageProvider({
  id: 'local-device',
  label: 'This device',
  description:
    'Documents stored privately on this device — files in the app data folder (desktop) or persistent browser storage (web). No account or setup needed',
  preferenceFields: [],
  credentialFields: [],
  createAdapter: () => createLocalDeviceStorageAdapter()
})

export const S3_STORAGE_PROVIDER = defineStorageProvider({
  id: 's3-compatible',
  label: 'S3 compatible',
  description: 'AWS S3, Backblaze B2, Cloudflare R2, MinIO, and compatible storage',
  preferenceFields: [
    { id: 'endpoint', label: 'Endpoint', kind: 'url', required: true },
    { id: 'bucket', label: 'Bucket', kind: 'text', required: true },
    { id: 'region', label: 'Region', kind: 'text' }
  ],
  credentialFields: [
    { id: 'access-key-id', label: 'Access key ID', required: true },
    { id: 'secret-access-key', label: 'Secret access key', required: true }
  ],
  createAdapter: createS3StorageAdapter
})

export const storageProviderRegistry = new StorageProviderRegistry([
  LOCAL_STORAGE_PROVIDER,
  S3_STORAGE_PROVIDER
])

/** Like registry.get, but survives a stale persisted provider id (falls back to S3). */
export function resolveStorageProvider(id: StorageProviderID): StorageProviderRegistration {
  try {
    return storageProviderRegistry.get(id)
  } catch {
    return S3_STORAGE_PROVIDER
  }
}
