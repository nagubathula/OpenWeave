import 'fake-indexeddb/auto'
import { describe, expect, test } from 'bun:test'

import {
  createLocalDeviceStorageAdapter,
  LOCAL_STORAGE_PROVIDER,
  resolveStorageProvider,
  storageProviderRegistry
} from '@/app/integrations/storage'

import { expectDefined } from '#tests/helpers/assert'

describe('local device storage provider', () => {
  test('registers without preferences or credentials', () => {
    const provider = storageProviderRegistry.get('local-device')
    expect(provider.preferenceFields).toHaveLength(0)
    expect(provider.credentialFields).toHaveLength(0)
    expect(resolveStorageProvider('local-device')).toBe(provider)
    expect(resolveStorageProvider('no-such-provider').id).toBe('s3-compatible')
  })

  test('round-trips documents, metadata, and thumbnails', async () => {
    const adapter = LOCAL_STORAGE_PROVIDER.createAdapter({
      preferences: {},
      resolveCredential: () => Promise.resolve(null)
    })

    expect((await adapter.testConnection()).ok).toBe(true)
    expect(await adapter.listDocuments()).toEqual([])

    const progress: number[] = []
    await adapter.putDocument(
      'doc-1',
      new Uint8Array([1, 2, 3]),
      { name: 'First', updatedAt: '2026-01-01T00:00:00.000Z' },
      ({ transferredBytes }) => progress.push(transferredBytes)
    )
    await adapter.putDocument('doc-2', new Uint8Array([4, 5]), {
      name: 'Second',
      updatedAt: '2026-02-01T00:00:00.000Z'
    })
    await adapter.putThumbnail?.('doc-1', new Uint8Array([9]))
    expect(progress).toEqual([3])

    const listed = await adapter.listDocuments()
    expect(listed.map((document) => document.id)).toEqual(['doc-2', 'doc-1'])
    expect(listed[0]?.metadataAuthoritative).toBe(true)

    expect([...(await adapter.getDocument('doc-1'))]).toEqual([1, 2, 3])
    expect(await adapter.getDocumentMetadata?.('doc-1')).toEqual({
      name: 'First',
      updatedAt: '2026-01-01T00:00:00.000Z'
    })
    expect([...expectDefined(await adapter.getThumbnail?.('doc-1'))]).toEqual([9])

    const usage = await adapter.getUsage()
    expect(usage.documentCount).toBe(2)
    expect(usage.bytesUsed).toBe(6)
  })

  test('overwrites in place and deletes all sidecars', async () => {
    const adapter = createLocalDeviceStorageAdapter()

    await adapter.putDocument('doc-1', new Uint8Array([7, 7, 7, 7]), {
      name: 'Renamed',
      updatedAt: '2026-03-01T00:00:00.000Z'
    })
    expect((await adapter.listDocuments()).find((document) => document.id === 'doc-1')?.name).toBe(
      'Renamed'
    )
    expect([...(await adapter.getDocument('doc-1'))]).toEqual([7, 7, 7, 7])

    await adapter.deleteDocument('doc-1')
    await adapter.deleteDocument('doc-1') // idempotent
    expect((await adapter.listDocuments()).some((document) => document.id === 'doc-1')).toBe(false)
    expect(await adapter.getThumbnail?.('doc-1')).toBeNull()
    await expect(adapter.getDocument('doc-1')).rejects.toThrow('Document not found: doc-1')
  })

  test('reports a missing document instead of returning empty bytes', async () => {
    const adapter = createLocalDeviceStorageAdapter()
    await expect(adapter.getDocument('ghost')).rejects.toThrow('Document not found: ghost')
    expect(await adapter.getDocumentMetadata?.('ghost')).toBeNull()
  })
})
