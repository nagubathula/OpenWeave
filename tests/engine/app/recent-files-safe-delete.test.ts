import { afterEach, beforeEach, describe, expect, test } from 'bun:test'

import { addRecentFile, getRecentFiles, removeRecentFile } from '@/app/home/recent-files'

describe('Recent Files Safe Delete & Restore', () => {
  const hadOriginalWindow = 'window' in globalThis
  const originalWindow = (globalThis as unknown as { window?: unknown }).window

  beforeEach(() => {
    const storageMap = new Map<string, string>()
    const mockStorage = {
      getItem: (k: string) => storageMap.get(k) ?? null,
      setItem: (k: string, v: string) => storageMap.set(k, v),
      removeItem: (k: string) => storageMap.delete(k),
      clear: () => storageMap.clear(),
      get length() {
        return storageMap.size
      },
      key: (i: number) => Array.from(storageMap.keys())[i] ?? null
    }

    Object.defineProperty(globalThis, 'window', {
      value: {
        ...globalThis.window,
        localStorage: mockStorage,
        addEventListener: () => {},
        removeEventListener: () => {}
      },
      writable: true,
      configurable: true
    })

    // Clear recents
    for (const file of getRecentFiles()) {
      removeRecentFile(file.id)
    }
  })

  afterEach(() => {
    if (hadOriginalWindow) {
      Object.defineProperty(globalThis, 'window', {
        value: originalWindow,
        configurable: true,
        writable: true
      })
    } else {
      delete (globalThis as unknown as { window?: unknown }).window
    }
  })

  test('adds, removes, and restores recent file snapshot upon undo', () => {
    const docEntry = {
      id: 'doc-123',
      name: 'Mobile App Wireframes',
      path: '/projects/mobile-app.fig',
      storageId: 'storage-xyz',
      format: 'fig' as const
    }

    // 1. Add recent file
    addRecentFile(docEntry)
    let files = getRecentFiles()
    expect(files.some((f) => f.id === docEntry.id && f.name === docEntry.name)).toBe(true)

    // 2. Backup and remove
    const found = files.find((f) => f.id === docEntry.id)
    expect(found).toBeDefined()
    if (!found) return
    const snapshot = { ...found }
    removeRecentFile(docEntry.id)
    files = getRecentFiles()
    expect(files.some((f) => f.id === docEntry.id)).toBe(false)

    // 3. Restore (simulating Undo toast click)
    addRecentFile({
      id: snapshot.id,
      name: snapshot.name,
      path: snapshot.path,
      storageId: snapshot.storageId,
      format: snapshot.format,
      updatedAt: snapshot.updatedAt
    })

    files = getRecentFiles()
    const restored = files.find((f) => f.id === docEntry.id)
    expect(restored).toBeDefined()
    expect(restored?.name).toBe('Mobile App Wireframes')
    expect(restored?.path).toBe('/projects/mobile-app.fig')
  })
})
