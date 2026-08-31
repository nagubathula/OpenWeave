import { afterEach, describe, expect, test } from 'bun:test'

import { createFsLocalDeviceStorageAdapter } from '@/app/integrations/storage/local/fs'

import { expectDefined } from '#tests/helpers/assert'
import { clearTauriMocks, mockTauriIPC } from '#tests/helpers/tauri/mocks'

const STORAGE_DIR = 'storage/local/v1'

/** In-memory filesystem answering the plugin-fs IPC commands the adapter uses. */
function mockFilesystem() {
  const files = new Map<string, Uint8Array>()
  const relative = (path: string) => path.replace(`${STORAGE_DIR}/`, '')

  return {
    files,
    write(name: string, bytes: Uint8Array) {
      files.set(name, bytes)
    },
    handler(cmd: string, args: unknown, options?: unknown) {
      if (cmd === 'plugin:fs|mkdir') return null
      if (cmd === 'plugin:fs|write_file') {
        const headers = (options as { headers: { path: string } }).headers
        const name = relative(decodeURIComponent(headers.path))
        files.set(name, new Uint8Array(args as ArrayBuffer))
        return null
      }
      const path = (args as { path: string }).path
      if (cmd === 'plugin:fs|read_file') {
        const bytes = files.get(relative(path))
        if (!bytes) throw new Error(`No such file: ${path}`)
        return [...bytes]
      }
      if (cmd === 'plugin:fs|read_dir') {
        return [...files.keys()].map((name) => ({
          name,
          isFile: true,
          isDirectory: false,
          isSymlink: false
        }))
      }
      if (cmd === 'plugin:fs|exists') return files.has(relative(path))
      if (cmd === 'plugin:fs|remove') {
        files.delete(relative(path))
        return null
      }
      if (cmd === 'plugin:fs|stat') {
        const bytes = files.get(relative(path))
        if (!bytes) throw new Error(`No such file: ${path}`)
        return {
          isFile: true,
          isDirectory: false,
          isSymlink: false,
          size: bytes.byteLength,
          mtime: null,
          atime: null,
          birthtime: null,
          readonly: false
        }
      }
      throw new Error(`Unexpected IPC command: ${cmd}`)
    }
  }
}

afterEach(async () => {
  await clearTauriMocks()
  Reflect.deleteProperty(globalThis, 'window')
})

describe('local device storage adapter (Tauri filesystem backend)', () => {
  test('round-trips documents and thumbnails as files on disk', async () => {
    const disk = mockFilesystem()
    await mockTauriIPC(disk.handler)
    const adapter = createFsLocalDeviceStorageAdapter()

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
    expect([...disk.files.keys()].sort()).toEqual([
      'doc-1.fig',
      'doc-1.meta.json',
      'doc-1.thumb.jpg',
      'doc-2.fig',
      'doc-2.meta.json'
    ])

    const listed = await adapter.listDocuments()
    expect(listed.map((document) => document.id)).toEqual(['doc-2', 'doc-1'])
    expect(listed[1]?.name).toBe('First')
    expect(listed[0]?.metadataAuthoritative).toBe(true)

    expect([...(await adapter.getDocument('doc-1'))]).toEqual([1, 2, 3])
    expect(await adapter.getDocumentMetadata?.('doc-1')).toEqual({
      name: 'First',
      updatedAt: '2026-01-01T00:00:00.000Z'
    })
    expect([...expectDefined(await adapter.getThumbnail?.('doc-1'))]).toEqual([9])

    const usage = await adapter.getUsage()
    expect(usage.documentCount).toBe(2)
    expect(usage.objectCount).toBe(5)
  })

  test('lists a document without a metadata sidecar using fallbacks', async () => {
    const disk = mockFilesystem()
    disk.write('orphan.fig', new Uint8Array([1]))
    await mockTauriIPC(disk.handler)
    const adapter = createFsLocalDeviceStorageAdapter()

    const listed = await adapter.listDocuments()
    expect(listed).toEqual([
      {
        id: 'orphan',
        name: 'orphan',
        updatedAt: new Date(0).toISOString(),
        metadataAuthoritative: false
      }
    ])
    expect(await adapter.getDocumentMetadata?.('orphan')).toBeNull()
  })

  test('deletes all sidecars and stays idempotent', async () => {
    const disk = mockFilesystem()
    await mockTauriIPC(disk.handler)
    const adapter = createFsLocalDeviceStorageAdapter()

    await adapter.putDocument('doc-1', new Uint8Array([7]), {
      name: 'Doomed',
      updatedAt: '2026-03-01T00:00:00.000Z'
    })
    await adapter.putThumbnail?.('doc-1', new Uint8Array([8]))

    await adapter.deleteDocument('doc-1')
    await adapter.deleteDocument('doc-1') // idempotent
    expect(disk.files.size).toBe(0)
    await expect(adapter.getDocument('doc-1')).rejects.toThrow('Document not found: doc-1')
  })
})
