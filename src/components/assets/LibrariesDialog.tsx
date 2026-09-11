import { BookOpen, Check, Download, Package, Trash2, Upload } from 'lucide-react'
import React, { useMemo, useState, useSyncExternalStore } from 'react'

import { downloadBlob } from '@/app/document/io/browser'
import { useEditorStore } from '@/app/editor/active-store'
import {
  deleteSharedLibrary,
  exportLibraryJson,
  getSharedLibrariesServerSnapshot,
  importLibraryJson,
  listSharedLibraries,
  publishComponentsToLibrary,
  subscribeSharedLibraries,
  toggleSharedLibrary
} from '@/app/libraries/library-store'
import { AppDialogHeader, AppDialogRoot } from '@/components/ui/dialog'

interface LibrariesDialogProps {
  _brand?: 'LibrariesDialog'
  open: boolean
  onClose: () => void
}

export default function LibrariesDialog({ open, onClose }: LibrariesDialogProps) {
  const editor = useEditorStore()
  const libraries = useSyncExternalStore(
    subscribeSharedLibraries,
    listSharedLibraries,
    getSharedLibrariesServerSnapshot
  )
  const [activeTab, setActiveTab] = useState<'browse' | 'publish'>('browse')

  // Local components available for publishing
  const localComponents = useMemo(() => {
    return [...editor.graph.nodes.values()].filter((n) => {
      if (n.type === 'COMPONENT_SET') return true
      if (n.type === 'COMPONENT') {
        const parent = n.parentId ? editor.graph.getNode(n.parentId) : null
        return parent?.type !== 'COMPONENT_SET'
      }
      return false
    })
  }, [editor])

  const [selectedComponentIds, setSelectedComponentIds] = useState<Set<string>>(
    () => new Set(localComponents.map((c) => c.id))
  )
  const [libName, setLibName] = useState('Design System')
  const [libVersion, setLibVersion] = useState('1.0.0')
  const [libDesc, setLibDesc] = useState('')
  const [publishSuccess, setPublishSuccess] = useState(false)

  const toggleSelectComponent = (id: string) => {
    setSelectedComponentIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handlePublish = () => {
    if (selectedComponentIds.size === 0 || !libName.trim()) return
    publishComponentsToLibrary((id) => editor.graph.getNode(id), [...selectedComponentIds], {
      name: libName,
      version: libVersion,
      description: libDesc
    })
    setPublishSuccess(true)
    setTimeout(() => {
      setPublishSuccess(false)
      setActiveTab('browse')
    }, 1200)
  }

  const handleExport = (id: string) => {
    const json = exportLibraryJson(id)
    if (!json) return
    downloadBlob(new TextEncoder().encode(json), `openweave-library-${id}.json`, 'application/json')
  }

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    void file.text().then((text) => {
      importLibraryJson(text)
    })
    e.target.value = ''
  }

  return (
    <AppDialogRoot open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <div className="w-[520px] max-w-[90vw] overflow-hidden rounded-xl border border-border bg-panel shadow-2xl">
        <AppDialogHeader heading="Shared Libraries" />

        {/* Tab navigation */}
        <div className="flex border-b border-border bg-input/20 px-4">
          <button
            type="button"
            className={`border-b-2 px-3 py-2 text-xs font-medium transition-colors ${
              activeTab === 'browse'
                ? 'border-accent text-surface'
                : 'border-transparent text-muted hover:text-surface'
            }`}
            onClick={() => setActiveTab('browse')}
          >
            Installed Libraries ({libraries.length})
          </button>
          <button
            type="button"
            className={`border-b-2 px-3 py-2 text-xs font-medium transition-colors ${
              activeTab === 'publish'
                ? 'border-accent text-surface'
                : 'border-transparent text-muted hover:text-surface'
            }`}
            onClick={() => setActiveTab('publish')}
          >
            Publish Current File
          </button>
        </div>

        <div className="p-4">
          {activeTab === 'browse' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted">
                  Libraries available to insert components into this document.
                </span>
                <label className="inline-flex cursor-pointer items-center gap-1.5 rounded border border-border bg-input/40 px-2.5 py-1 text-xs text-surface hover:bg-hover">
                  <Upload className="size-3.5" />
                  <span>Import .json</span>
                  <input
                    type="file"
                    accept=".json,application/json"
                    className="hidden"
                    onChange={handleImport}
                  />
                </label>
              </div>

              {libraries.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-8 text-center">
                  <Package className="size-8 text-muted/60 mb-2" />
                  <p className="text-xs font-medium text-surface">No shared libraries installed</p>
                  <p className="mt-1 text-[11px] text-muted">
                    Publish your components from this file or import an existing library.
                  </p>
                  <button
                    type="button"
                    className="mt-3 rounded bg-accent px-3 py-1.5 text-xs font-medium text-accent-foreground hover:bg-accent/90"
                    onClick={() => setActiveTab('publish')}
                  >
                    Publish Library
                  </button>
                </div>
              ) : (
                <div className="max-h-72 space-y-2 overflow-y-auto">
                  {libraries.map((lib) => (
                    <div
                      key={lib.id}
                      className="flex items-center justify-between rounded-lg border border-border bg-input/30 p-3"
                    >
                      <div className="min-w-0 flex-1 pr-3">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-xs text-surface">{lib.name}</span>
                          <span className="rounded bg-panel-field px-1.5 py-0.5 text-[10px] text-muted">
                            v{lib.version}
                          </span>
                        </div>
                        <p className="mt-0.5 text-[11px] text-muted truncate">
                          {lib.components.length} components
                          {lib.description ? ` • ${lib.description}` : ''}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          aria-label={lib.enabled ? 'Disable library' : 'Enable library'}
                          className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                            lib.enabled
                              ? 'bg-accent/20 text-accent hover:bg-accent/30'
                              : 'bg-input text-muted hover:text-surface'
                          }`}
                          onClick={() => toggleSharedLibrary(lib.id, !lib.enabled)}
                        >
                          {lib.enabled ? 'Active' : 'Enable'}
                        </button>
                        <button
                          type="button"
                          aria-label="Export Library JSON"
                          className="rounded p-1 text-muted hover:bg-hover hover:text-surface"
                          onClick={() => handleExport(lib.id)}
                        >
                          <Download className="size-3.5" />
                        </button>
                        <button
                          type="button"
                          aria-label="Delete Library"
                          className="rounded p-1 text-muted hover:bg-hover hover:text-red-400"
                          onClick={() => deleteSharedLibrary(lib.id)}
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'publish' && (
            <div className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-medium text-muted">Library Name</label>
                  <input
                    type="text"
                    value={libName}
                    onChange={(e) => setLibName(e.target.value)}
                    placeholder="e.g. Core UI"
                    className="mt-1 w-full rounded border border-border bg-input/50 px-2.5 py-1.5 text-xs text-surface outline-none focus:border-accent"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-muted">Version</label>
                  <input
                    type="text"
                    value={libVersion}
                    onChange={(e) => setLibVersion(e.target.value)}
                    placeholder="1.0.0"
                    className="mt-1 w-full rounded border border-border bg-input/50 px-2.5 py-1.5 text-xs text-surface outline-none focus:border-accent"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-medium text-muted">Description (optional)</label>
                <input
                  type="text"
                  value={libDesc}
                  onChange={(e) => setLibDesc(e.target.value)}
                  placeholder="Design tokens, buttons, and layouts"
                  className="mt-1 w-full rounded border border-border bg-input/50 px-2.5 py-1.5 text-xs text-surface outline-none focus:border-accent"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-medium text-muted">
                    Select Components ({selectedComponentIds.size} of {localComponents.length})
                  </span>
                  <div className="flex gap-2 text-[11px]">
                    <button
                      type="button"
                      className="text-component hover:underline"
                      onClick={() =>
                        setSelectedComponentIds(new Set(localComponents.map((c) => c.id)))
                      }
                    >
                      Select all
                    </button>
                    <button
                      type="button"
                      className="text-muted hover:underline"
                      onClick={() => setSelectedComponentIds(new Set())}
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <div className="max-h-44 space-y-1 overflow-y-auto rounded-md border border-border bg-input/30 p-2">
                  {localComponents.length === 0 ? (
                    <p className="py-3 text-center text-xs text-muted">
                      No components found in current document
                    </p>
                  ) : (
                    localComponents.map((comp) => {
                      const checked = selectedComponentIds.has(comp.id)
                      return (
                        <label
                          key={comp.id}
                          className="flex cursor-pointer items-center justify-between gap-2 rounded px-2 py-1 text-xs hover:bg-hover"
                        >
                          <div className="flex items-center gap-2 truncate">
                            <span className="text-component">◇</span>
                            <span className="truncate text-surface">{comp.name}</span>
                          </div>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleSelectComponent(comp.id)}
                            className="rounded border-border accent-accent"
                          />
                        </label>
                      )
                    })
                  )}
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  disabled={selectedComponentIds.size === 0 || !libName.trim() || publishSuccess}
                  className="inline-flex items-center gap-1.5 rounded bg-accent px-4 py-2 text-xs font-semibold text-accent-foreground hover:bg-accent/90 disabled:opacity-50"
                  onClick={handlePublish}
                >
                  {publishSuccess ? (
                    <>
                      <Check className="size-3.5" />
                      <span>Published!</span>
                    </>
                  ) : (
                    <>
                      <BookOpen className="size-3.5" />
                      <span>Publish Library</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppDialogRoot>
  )
}
