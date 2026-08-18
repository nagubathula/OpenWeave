import { useStore } from '@nanostores/react'
import { Files, X } from 'lucide-react'
import { atom } from 'nanostores'
import React, { useCallback, useEffect, useRef, useState } from 'react'

import {
  activeStorageProviderID,
  createActiveStorageAdapter,
  storageCredentialStatuses,
  storagePreferencesComplete,
  storageProviderRegistry,
  type StorageDocument
} from '@/app/integrations/storage'
import { openSettingsDialog, settingsDialogOpen } from '@/app/settings/dialog'
import { createCanvasId } from '@/app/storage/id'
import { getLocalCanvasStore } from '@/app/storage/local-store'
import { reconcileStorageDocuments } from '@/app/storage/reconcile'
import { activeTab, createTab, openStorageDocumentInNewTab } from '@/app/tabs'

/**
 * Document library / browser. Ported from src/views/StorageView.vue.
 *
 * Next's app-router makes a dedicated route awkward, so instead of a route this
 * ships as a self-contained overlay toggled by a module-level Vue ref. Open it
 * with `openStorageWorkspace()` (e.g. from a menu action) and render
 * `<StorageWorkspace />` once near the app root — it renders nothing while closed.
 */
const storageWorkspaceOpen = atom(false)
// Bumped on every openStorageWorkspace() call so an already-open workspace
// re-lists documents (e.g. after storage settings were just configured); the
// Vue router remounted the view on navigation, this overlay stays mounted.
const storageWorkspaceRefreshTick = atom(0)

/** Keeps the address bar at /storage while the workspace overlay is open (SPA-only —
 * direct visits are served by the /storage route, which opens the overlay on mount). */
function syncStorageUrl(open: boolean): void {
  if (typeof window === 'undefined') return
  const onStorageUrl = window.location.pathname.endsWith('/storage')
  if (open && !onStorageUrl) {
    window.history.pushState({}, '', '/storage')
  } else if (!open && onStorageUrl) {
    window.history.pushState({}, '', '/')
  }
}

export function openStorageWorkspace(): void {
  storageWorkspaceOpen.set(true)
  storageWorkspaceRefreshTick.set(storageWorkspaceRefreshTick.get() + 1)
  syncStorageUrl(true)
}

export default function StorageWorkspace() {
  const open = useStore(storageWorkspaceOpen)
  const refreshTick = useStore(storageWorkspaceRefreshTick)
  const [documents, setDocuments] = useState<StorageDocument[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [configured, setConfigured] = useState(false)

  const close = () => {
    storageWorkspaceOpen.set(false)
    syncStorageUrl(false)
  }

  const refresh = useCallback(async (): Promise<void> => {
    setLoading(true)
    setError(null)
    const providerId = activeStorageProviderID.get()
    const localStore = getLocalCanvasStore()

    // Paint locally-cached documents immediately.
    const localMetas = (await localStore.listMetas()).filter(
      (metadata) => metadata.providerId === providerId
    )
    setDocuments(
      localMetas.map((metadata) => ({
        id: metadata.id,
        name: metadata.name,
        updatedAt: metadata.updatedAt,
        metadataAuthoritative: true
      }))
    )

    try {
      const provider = storageProviderRegistry.get(providerId)
      const statuses = await storageCredentialStatuses(provider.id)
      const isConfigured =
        storagePreferencesComplete(provider.id) &&
        provider.credentialFields.every(
          (field) => !field.required || statuses[field.id] === 'configured'
        )
      setConfigured(isConfigured)
      if (!isConfigured) {
        setError('Configure storage before using this workspace.')
        return
      }

      const remote = await createActiveStorageAdapter().listDocuments()
      const local = (await localStore.listMetas(true)).filter(
        (metadata) => metadata.providerId === providerId
      )
      const reconciliation = reconcileStorageDocuments(local, remote)
      setDocuments(reconciliation.documents)

      for (const id of reconciliation.localIdsToPurge) await localStore.remove(id)
      for (const document of reconciliation.remoteDocumentsToSeed) {
        await localStore.upsertIndexMeta({
          id: document.id,
          providerId,
          name: document.name,
          updatedAt: document.updatedAt,
          syncStatus: 'synced',
          lastSyncedAt: document.updatedAt,
          lastSyncError: null
        })
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (open) void refresh()
  }, [open, refreshTick, refresh])

  // Re-list documents once the Settings dialog closes (e.g. storage was just
  // configured there) — the workspace stays mounted across the dialog, so it
  // wouldn't otherwise notice the change.
  const settingsOpen = useStore(settingsDialogOpen)
  const wasSettingsOpen = useRef(settingsOpen)
  useEffect(() => {
    if (wasSettingsOpen.current && !settingsOpen && open) void refresh()
    wasSettingsOpen.current = settingsOpen
  }, [settingsOpen, open, refresh])

  if (!open) return null

  const openDocument = async (document: StorageDocument): Promise<void> => {
    close()
    await openStorageDocumentInNewTab(document)
  }

  const createDocument = async (): Promise<void> => {
    if (!configured) return
    close()
    const current = activeTab.get()
    const store =
      current?.store.state.documentName === 'Untitled' && !current.store.undo.canUndo
        ? current.store
        : createTab().store
    const documentId = createCanvasId()
    store.setStorageDocumentSource(
      { providerId: activeStorageProviderID.get(), documentId },
      'Untitled'
    )
    await store.saveFigFile()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-app text-surface"
      data-test-id="storage-workspace"
    >
      <header className="flex h-14 shrink-0 items-center border-b border-border px-6">
        <div>
          <h1 className="text-sm font-semibold">Storage workspace</h1>
          <p className="text-[10px] text-muted">{activeStorageProviderID.get()}</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            className="rounded px-3 py-1.5 text-xs text-muted hover:bg-hover hover:text-surface"
            onClick={() => openSettingsDialog('storage')}
          >
            Settings
          </button>
          <button
            type="button"
            data-test-id="storage-new-document"
            disabled={!configured}
            className="rounded bg-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={() => void createDocument()}
          >
            New document
          </button>
          <button
            type="button"
            aria-label="Close"
            className="flex size-7 items-center justify-center rounded text-muted hover:bg-hover hover:text-surface"
            onClick={close}
          >
            <X className="size-4" />
          </button>
        </div>
      </header>

      <section className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col p-6">
        <div className="mb-4 flex shrink-0 items-center justify-between">
          {error && configured ? (
            <p className="text-xs text-danger" role="alert">
              {error}
            </p>
          ) : (
            <span />
          )}
          {configured && (
            <button
              type="button"
              className="rounded px-2 py-1 text-xs text-muted hover:bg-hover hover:text-surface"
              onClick={() => void refresh()}
            >
              Refresh
            </button>
          )}
        </div>

        {documents.length > 0 ? (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(190px,1fr))] gap-4 overflow-y-auto">
            {documents.map((document) => (
              <button
                key={document.id}
                type="button"
                data-document-id={document.id}
                className="group overflow-hidden rounded-lg border border-border bg-panel text-left hover:border-panel-focus hover:bg-hover"
                onClick={() => void openDocument(document)}
              >
                <div className="aspect-[4/3] bg-panel-field" />
                <div className="border-t border-border p-3">
                  <p className="truncate text-xs font-medium">{document.name}</p>
                  <p className="mt-1 text-[10px] text-muted">
                    {new Date(document.updatedAt).toLocaleString()}
                  </p>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-muted">
            <Files className="size-5" />
            <p className="text-xs">
              {loading
                ? 'Loading documents...'
                : configured
                  ? 'No documents yet.'
                  : 'Configure storage before using this workspace.'}
            </p>
            {!configured && !loading && (
              <button
                type="button"
                className="rounded bg-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-accent/90"
                onClick={() => openSettingsDialog('storage')}
              >
                Settings
              </button>
            )}
          </div>
        )}
      </section>
    </div>
  )
}
