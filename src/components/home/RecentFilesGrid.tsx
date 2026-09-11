import { useStore } from '@nanostores/react'
import { ExternalLink, FileText, FolderOpen, Plus, Trash2 } from 'lucide-react'
import React, { useCallback, useEffect, useState } from 'react'

import { getRecentFiles, recentFilesRevision, removeRecentFile } from '@/app/home/recent-files'
import { closeHome, homeSearchQuery, homeViewMode } from '@/app/home/store'
import { HOME_TEMPLATES } from '@/app/home/templates'
import { openFileDialog, openFileFromPath } from '@/app/shell/menu/files'
import { getLocalCanvasStore } from '@/app/storage/local-store'
import {
  allTabs,
  closeTab,
  createTab,
  getTabsSnapshot,
  openStorageDocumentInNewTab,
  openTemplateInTab,
  switchTab
} from '@/app/tabs'

export interface RecentDocItem {
  id: string
  name: string
  path?: string | null
  tabId?: string
  storageId?: string
  templateId?: string
  format: 'fig' | 'pen' | 'document'
  updatedAt: string
  isOpen: boolean
}

function formatTimeAgo(isoString: string): string {
  try {
    const date = new Date(isoString)
    const now = new Date()
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (seconds < 60) return 'Just now'
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    if (days < 30) return `${days}d ago`
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  } catch {
    return 'Recently'
  }
}

function DocumentThumbnail({
  storageId,
  format
}: {
  storageId?: string
  format: 'fig' | 'pen' | 'document'
}) {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!storageId) {
      setUrl(null)
      return
    }

    let active = true
    let objectUrl: string | null = null

    const loadThumb = async () => {
      try {
        const store = getLocalCanvasStore()
        const bytes = await store.readThumb(storageId)
        if (!active) return
        if (bytes && bytes.length > 0) {
          objectUrl = URL.createObjectURL(new Blob([new Uint8Array(bytes)], { type: 'image/png' }))
          setUrl(objectUrl)
        } else {
          setUrl(null)
        }
      } catch {
        if (active) setUrl(null)
      }
    }

    void loadThumb()
    return () => {
      active = false
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [storageId])

  if (url) {
    return (
      <img
        src={url}
        alt=""
        className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
        draggable={false}
      />
    )
  }

  const bgGrad =
    format === 'pen'
      ? 'from-emerald-950/40 via-teal-900/20 to-neutral-950'
      : 'from-blue-950/40 via-indigo-900/20 to-neutral-950'

  return (
    <div
      className={`flex h-full w-full flex-col items-center justify-center bg-gradient-to-b ${bgGrad} p-4 text-muted/50`}
    >
      <div className="flex size-10 items-center justify-center rounded-xl bg-input/40 text-muted shadow-sm transition-transform group-hover:scale-110">
        <FileText className="size-5 stroke-[1.5]" />
      </div>
    </div>
  )
}

interface RecentFilesGridProps {
  onCountChange?: (count: number) => void
}

export default function RecentFilesGrid({ onCountChange }: RecentFilesGridProps) {
  const [documents, setDocuments] = useState<RecentDocItem[]>([])
  const [loading, setLoading] = useState(true)
  const searchQuery = useStore(homeSearchQuery)
  const viewMode = useStore(homeViewMode)
  const tabsList = useStore(allTabs)
  const recentsRev = useStore(recentFilesRevision)

  const loadDocuments = useCallback(async () => {
    setLoading(true)
    try {
      const itemsMap = new Map<string, RecentDocItem>()

      // 1. Collect currently open tabs
      const openTabs = getTabsSnapshot()
      for (const tab of openTabs) {
        const docName = tab.store.state.documentName || 'Untitled'
        const filePath =
          typeof tab.store.getDocumentFilePath === 'function'
            ? tab.store.getDocumentFilePath()
            : null
        const storageBinding =
          typeof tab.store.getStorageBinding === 'function' ? tab.store.getStorageBinding() : null

        // Omit auto-generated untouched "Untitled" scratch tabs from recent files
        const isUntouched =
          docName === 'Untitled' && !tab.store.undo.canUndo && !filePath && !storageBinding
        if (isUntouched) continue

        const format = filePath?.toLowerCase().endsWith('.pen') ? 'pen' : 'fig'
        const key = filePath ?? storageBinding?.documentId ?? tab.id

        itemsMap.set(key, {
          id: key,
          name: docName,
          path: filePath ?? null,
          tabId: tab.id,
          storageId: storageBinding?.documentId,
          format,
          updatedAt: new Date().toISOString(),
          isOpen: true
        })
      }

      // 2. Collect persistent recents from disk/session
      const persistent = getRecentFiles()
      for (const item of persistent) {
        const key = item.path ?? item.id
        let existing = itemsMap.get(key)
        if (!existing) {
          for (const val of itemsMap.values()) {
            if (
              (item.path && val.path === item.path) ||
              (item.storageId && val.storageId === item.storageId) ||
              (val.name !== 'Untitled' && val.name.toLowerCase() === item.name.toLowerCase())
            ) {
              existing = val
              break
            }
          }
        }

        if (existing) {
          existing.path = item.path ?? existing.path
          if (item.templateId) existing.templateId = item.templateId
          if (item.storageId) existing.storageId = item.storageId
          if (new Date(item.updatedAt).getTime() > new Date(existing.updatedAt).getTime()) {
            existing.updatedAt = item.updatedAt
          }
        } else {
          itemsMap.set(key, {
            id: key,
            name: item.name,
            path: item.path ?? null,
            templateId: item.templateId,
            storageId: item.storageId,
            format: item.format,
            updatedAt: item.updatedAt,
            isOpen: false
          })
        }
      }

      // 3. Collect local storage workspace documents
      try {
        const store = getLocalCanvasStore()
        const metas = await store.listMetas()
        for (const meta of metas) {
          if (meta.tombstoned) continue
          let existing = itemsMap.get(meta.id)
          if (!existing) {
            for (const val of itemsMap.values()) {
              if (
                val.storageId === meta.id ||
                (val.name !== 'Untitled' && val.name.toLowerCase() === meta.name.toLowerCase())
              ) {
                existing = val
                break
              }
            }
          }

          if (existing) {
            existing.storageId = meta.id
          } else {
            itemsMap.set(meta.id, {
              id: meta.id,
              name: meta.name,
              storageId: meta.id,
              format: 'fig',
              updatedAt: meta.updatedAt,
              isOpen: false
            })
          }
        }
      } catch {
        // Storage might be offline in some web environments
      }

      // Sort newest first
      const sorted = [...itemsMap.values()].sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      )

      setDocuments(sorted)
      onCountChange?.(sorted.length)
    } catch {
      setDocuments([])
    } finally {
      setLoading(false)
    }
  }, [onCountChange])

  useEffect(() => {
    void loadDocuments()
  }, [loadDocuments, tabsList, recentsRev])

  const filteredDocs = documents.filter((doc) => {
    if (!searchQuery.trim()) return true
    return doc.name.toLowerCase().includes(searchQuery.toLowerCase())
  })

  const handleOpenDoc = async (doc: RecentDocItem) => {
    closeHome()

    // 1. If tab is already open with this tabId
    if (doc.tabId) {
      switchTab(doc.tabId)
      return
    }

    // 1b. Or if a tab is already open with the same document name
    const openTabs = getTabsSnapshot()
    const matchingTab = openTabs.find(
      (t) => t.store.state.documentName === doc.name && doc.name !== 'Untitled'
    )
    if (matchingTab) {
      switchTab(matchingTab.id)
      return
    }

    // 2. Open from disk if file path exists
    if (doc.path) {
      await openFileFromPath(doc.path)
      return
    }

    // 3. Open from storage if storageId exists
    if (doc.storageId) {
      await openStorageDocumentInNewTab({
        id: doc.storageId,
        name: doc.name,
        updatedAt: doc.updatedAt,
        metadataAuthoritative: true
      })
      return
    }

    // 4. Open from template (by templateId or matching name against HOME_TEMPLATES)
    const tpl = doc.templateId
      ? HOME_TEMPLATES.find((t) => t.id === doc.templateId)
      : HOME_TEMPLATES.find((t) => t.name.toLowerCase() === doc.name.toLowerCase())
    if (tpl) {
      openTemplateInTab(tpl)
      return
    }

    // 5. Fallback for unlinked document
    const tab = createTab()
    tab.store.state.documentName = doc.name
    void tab.store.fitCurrentPageToViewport()
  }

  const handleDeleteDoc = async (e: React.MouseEvent, doc: RecentDocItem) => {
    e.stopPropagation()
    if (doc.tabId) {
      closeTab(doc.tabId)
    }
    if (doc.path) {
      removeRecentFile(doc.path)
    }
    removeRecentFile(doc.id)
    if (doc.templateId) {
      removeRecentFile(`template-${doc.templateId}`)
    }
    const isTemplate =
      Boolean(doc.templateId) ||
      HOME_TEMPLATES.some((t) => t.name.toLowerCase() === doc.name.toLowerCase())
    if (isTemplate) {
      removeRecentFile(doc.name)
    }
    if (doc.storageId) {
      try {
        const store = getLocalCanvasStore()
        await store.remove(doc.storageId)
      } catch (err) {
        console.error('[Delete Doc]', err)
      }
    }
    await loadDocuments()
  }

  const handleOpenFromDisk = async () => {
    await openFileDialog()
    closeHome()
  }

  if (loading && documents.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center">
        <div className="text-xs text-muted">Loading documents...</div>
      </div>
    )
  }

  if (filteredDocs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/60 bg-panel/20 p-10 text-center">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-input/50 text-muted">
          <FolderOpen className="size-6" />
        </div>
        <h3 className="mt-3 text-sm font-semibold text-surface">
          {searchQuery ? 'No matching documents found' : 'No recent files yet'}
        </h3>
        <p className="mt-1 max-w-sm text-xs text-muted">
          {searchQuery
            ? `Could not find any files matching "${searchQuery}". Try a different keyword.`
            : 'Get started by creating a new design file, picking a template, or opening a .fig file from your computer.'}
        </p>
        <div className="mt-5 flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              createTab()
              closeHome()
            }}
            className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-xs font-semibold text-accent-fg shadow-sm transition-opacity hover:opacity-90 active:scale-98"
          >
            <Plus className="size-3.5" />
            <span>New design file</span>
          </button>
          <button
            type="button"
            onClick={() => void handleOpenFromDisk()}
            className="flex items-center gap-2 rounded-lg border border-border bg-panel px-4 py-2 text-xs font-medium text-surface transition-colors hover:bg-hover active:scale-98"
          >
            <ExternalLink className="size-3.5" />
            <span>Open from disk</span>
          </button>
        </div>
      </div>
    )
  }

  if (viewMode === 'list') {
    return (
      <div className="flex flex-col divide-y divide-border/40 rounded-xl border border-border/50 bg-panel/30 overflow-hidden">
        {filteredDocs.map((doc) => (
          <div
            key={doc.id}
            role="button"
            tabIndex={0}
            onClick={() => void handleOpenDoc(doc)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                void handleOpenDoc(doc)
              }
            }}
            className="group flex cursor-pointer items-center gap-3.5 px-4 py-2.5 transition-colors hover:bg-hover/60"
          >
            <div className="size-9 shrink-0 overflow-hidden rounded-md border border-border/60 bg-input/30">
              <DocumentThumbnail storageId={doc.storageId} format={doc.format} />
            </div>
            <div className="flex min-w-0 flex-1 flex-col">
              <div className="flex items-center gap-2">
                <span className="truncate text-xs font-medium text-surface group-hover:text-accent">
                  {doc.name}
                </span>
                {doc.isOpen && (
                  <span className="flex items-center gap-1 rounded bg-emerald-500/15 px-1.5 py-0.2 text-[9px] font-medium text-emerald-400">
                    <span className="size-1 rounded-full bg-emerald-400 animate-pulse" />
                    Open
                  </span>
                )}
              </div>
              <span className="text-[10px] text-muted truncate">
                {doc.path ? doc.path : `Edited ${formatTimeAgo(doc.updatedAt)}`}
              </span>
            </div>
            <span className="rounded bg-input/50 px-1.5 py-0.5 text-[9px] font-medium text-muted uppercase">
              .{doc.format}
            </span>
            <button
              type="button"
              aria-label="Delete document"
              onClick={(e) => void handleDeleteDoc(e, doc)}
              className="rounded p-1 text-muted opacity-0 transition-opacity group-hover:opacity-100 hover:bg-hover hover:text-red-400"
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {filteredDocs.map((doc) => (
        <div
          key={doc.id}
          role="button"
          tabIndex={0}
          onClick={() => void handleOpenDoc(doc)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              void handleOpenDoc(doc)
            }
          }}
          className="group relative flex cursor-pointer flex-col overflow-hidden rounded-xl border border-border/50 bg-panel/40 transition-all hover:border-accent/60 hover:bg-panel hover:shadow-md"
        >
          {/* Card Thumbnail */}
          <div className="relative aspect-[16/10] w-full overflow-hidden border-b border-border/40 bg-input/30">
            <DocumentThumbnail storageId={doc.storageId} format={doc.format} />
            <span className="absolute left-2.5 bottom-2.5 rounded bg-black/60 px-1.5 py-0.5 text-[9px] font-medium text-white backdrop-blur-sm uppercase">
              .{doc.format}
            </span>
            {doc.isOpen && (
              <span className="absolute right-2.5 top-2.5 flex items-center gap-1 rounded bg-black/60 px-1.5 py-0.5 text-[9px] font-medium text-emerald-400 backdrop-blur-sm">
                <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Open
              </span>
            )}
          </div>

          {/* Card Meta */}
          <div className="flex items-center justify-between p-3">
            <div className="min-w-0 flex-1 pr-2">
              <span className="block truncate text-xs font-medium text-surface transition-colors group-hover:text-accent">
                {doc.name}
              </span>
              <span className="block truncate text-[10px] text-muted">
                {doc.path ? doc.path : `Edited ${formatTimeAgo(doc.updatedAt)}`}
              </span>
            </div>

            <button
              type="button"
              aria-label="Delete document"
              onClick={(e) => void handleDeleteDoc(e, doc)}
              className="rounded p-1 text-muted opacity-0 transition-opacity group-hover:opacity-100 hover:bg-hover hover:text-red-400"
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
