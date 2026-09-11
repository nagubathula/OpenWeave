import { atom } from 'nanostores'

export interface RecentFileEntry {
  id: string
  name: string
  path?: string | null
  templateId?: string
  storageId?: string
  format: 'fig' | 'pen' | 'document'
  updatedAt: string
}

const RECENT_FILES_KEY = 'openweave_recent_files_v1'
const MAX_RECENT_FILES = 50

export const recentFilesRevision = atom<number>(0)

export function getRecentFiles(): RecentFileEntry[] {
  if (typeof window === 'undefined' || !window.localStorage) return []
  try {
    const raw = window.localStorage.getItem(RECENT_FILES_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as RecentFileEntry[]) : []
  } catch {
    return []
  }
}

export function addRecentFile(entry: {
  id?: string
  name: string
  path?: string | null
  templateId?: string
  storageId?: string
  format?: 'fig' | 'pen' | 'document'
  updatedAt?: string
}): void {
  if (typeof window === 'undefined' || !window.localStorage) return
  try {
    const recents = getRecentFiles()
    const id =
      entry.id ??
      entry.path ??
      (entry.templateId ? `template-${entry.templateId}` : `recent-${Date.now()}`)
    const existingIndex = recents.findIndex(
      (r) =>
        r.id === id ||
        (entry.path && r.path === entry.path) ||
        (entry.templateId && r.templateId === entry.templateId)
    )
    const updatedEntry: RecentFileEntry = {
      id,
      name: entry.name,
      path: entry.path ?? null,
      templateId: entry.templateId,
      storageId: entry.storageId,
      format: entry.format ?? 'fig',
      updatedAt: entry.updatedAt ?? new Date().toISOString()
    }
    const updated = [...recents]
    if (existingIndex !== -1) {
      updated.splice(existingIndex, 1)
    }
    updated.unshift(updatedEntry)
    if (updated.length > MAX_RECENT_FILES) {
      updated.length = MAX_RECENT_FILES
    }
    window.localStorage.setItem(RECENT_FILES_KEY, JSON.stringify(updated))
    recentFilesRevision.set(recentFilesRevision.get() + 1)
  } catch {
    // Ignore storage quota errors
  }
}

export function removeRecentFile(idOrPathOrName: string): void {
  if (typeof window === 'undefined' || !window.localStorage) return
  try {
    const recents = getRecentFiles().filter(
      (r) =>
        r.id !== idOrPathOrName &&
        r.path !== idOrPathOrName &&
        r.name !== idOrPathOrName &&
        (r.templateId ? `template-${r.templateId}` !== idOrPathOrName : true)
    )
    window.localStorage.setItem(RECENT_FILES_KEY, JSON.stringify(recents))
    recentFilesRevision.set(recentFilesRevision.get() + 1)
  } catch {
    // Ignore
  }
}

export function clearRecentFiles(): void {
  if (typeof window === 'undefined' || !window.localStorage) return
  try {
    window.localStorage.removeItem(RECENT_FILES_KEY)
    recentFilesRevision.set(recentFilesRevision.get() + 1)
  } catch {
    // Ignore
  }
}
