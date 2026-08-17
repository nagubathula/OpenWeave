import React, { useEffect, useMemo, useRef, useState } from 'react'
import * as ContextMenu from '@radix-ui/react-context-menu'
import { BookOpen, LayoutGrid, List, Loader2, Plus, Component as ComponentIcon } from 'lucide-react'
import { useI18n } from '@openweave/react'
import type { SceneNode } from '@openweave/scene-graph'

import { useEditorStore } from '@/app/editor/active-store'
import { useSceneComputed } from '@openweave/react'
import { nodeIcon } from '@/app/editor/icons'
import { findAssetPage } from '@/components/assets/page'
import { openExternalLink } from '@/app/shell/ui'
import { AppDialogRoot, AppDialogHeader } from '@/components/ui/dialog'
import { useButtonUI } from '@/components/ui/button'
import { useMenuUI } from '@/components/ui/menu'
import {
  ASSET_GRID_THUMBNAIL_SIZE,
  ASSET_LIST_THUMBNAIL_SIZE,
  ASSET_THUMBNAIL_RENDER_SCALE
} from '@/constants'
import Tip from '@/components/ui/Tip'

type AssetView = 'grid' | 'list'

type AssetVariantInfo = { name: string; values: string[] }

type LocalAsset = {
  id: string
  name: string
  node: SceneNode
  componentId: string | null
  variants: AssetVariantInfo[]
  variantCount: number
  hasConflicts: boolean
  sourceLibraryKey: string | null
  description: string
  docsUrl: string | null
  pageId: string
  pageName: string
}

type AssetGroup = {
  pageId: string
  pageName: string
  assets: LocalAsset[]
}

function AssetThumbnail({ nodeId, alt, size }: { nodeId: string; alt: string; size: number }) {
  const editor = useEditorStore()
  const [url, setUrl] = useState<string | null>(null)
  const sceneVersion = useSceneComputed(() => editor.state.sceneVersion)
  const isGrid = size === ASSET_GRID_THUMBNAIL_SIZE
  // Tracks the blob URL currently rendered in the <img>, so it can be revoked
  // only once a replacement is ready (or on unmount) — never while it's still
  // the src in the DOM, which would surface as a net::ERR_FILE_NOT_FOUND
  // console error the next time the browser touches that <img>.
  const currentUrlRef = useRef<string | null>(null)

  useEffect(() => {
    let active = true
    const node = editor.graph.getNode(nodeId)
    if (!node) {
      setUrl(null)
      return
    }
    const maxDimension = Math.max(node.width, node.height, 1)
    const scale = (size * ASSET_THUMBNAIL_RENDER_SCALE) / maxDimension
    const pageId = findAssetPage(node, editor.graph)?.id ?? editor.state.currentPageId
    void editor
      .renderExportImage([nodeId], scale, 'PNG', pageId)
      .then((data) => {
        if (!active) return
        const previousUrl = currentUrlRef.current
        if (data) {
          const objectUrl = URL.createObjectURL(new Blob([new Uint8Array(data)], { type: 'image/png' }))
          currentUrlRef.current = objectUrl
          setUrl(objectUrl)
        } else {
          currentUrlRef.current = null
          setUrl(null)
        }
        // Revoke the outgoing URL only after the new one has taken its place.
        if (previousUrl) URL.revokeObjectURL(previousUrl)
        return undefined
      })
      .catch(() => {
        if (active) setUrl(null)
      })
    return () => {
      active = false
    }
  }, [editor, nodeId, size, sceneVersion])

  useEffect(
    () => () => {
      if (currentUrlRef.current) URL.revokeObjectURL(currentUrlRef.current)
    },
    []
  )

  return (
    <div
      data-slot="asset-thumbnail"
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded bg-canvas/60 ${
        isGrid ? 'size-24' : 'size-10'
      }`}
    >
      {url ? (
        <img src={url} alt={alt} className="max-h-full max-w-full object-contain" draggable={false} />
      ) : (
        <ComponentIcon className="size-4 text-component" aria-hidden="true" />
      )}
    </div>
  )
}

export default function AssetsPanel() {
  const editor = useEditorStore()
  const { panels, dialogs } = useI18n()
  const [query, setQuery] = useState('')
  const [assetView, setAssetView] = useState<AssetView>('grid')
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)

  const insertButtonCls = useButtonUI({ tone: 'accent', size: 'md' }).base
  const contextMenuCls = useMenuUI({ content: 'min-w-44' })

  const sceneVersion = useSceneComputed(() => editor.state.sceneVersion)

  function componentSetVariantInfo(componentSetId: string): AssetVariantInfo[] {
    return [...editor.collectVariantOptions(componentSetId)].map(([name, values]) => ({
      name,
      values: [...values].sort((a, b) => a.localeCompare(b))
    }))
  }

  const assets = useSceneComputed<LocalAsset[]>(() => {
    const nodes = [...editor.graph.nodes.values()].filter(
      (node) => node.type === 'COMPONENT' || node.type === 'COMPONENT_SET'
    )
    return nodes
      .filter((node) => {
        if (node.type === 'COMPONENT_SET') return true
        const parent = node.parentId ? editor.graph.getNode(node.parentId) : null
        return parent?.type !== 'COMPONENT_SET'
      })
      .map((node) => {
        const defaultVariant =
          node.type === 'COMPONENT_SET'
            ? editor.getDefaultVariantForComponentSet(node.id)
            : node
        const page = findAssetPage(node, editor.graph)
        const conflicts =
          node.type === 'COMPONENT_SET' ? editor.getComponentSetVariantConflicts(node.id) : []
        return {
          id: node.id,
          name: node.name,
          node,
          componentId: defaultVariant?.id ?? null,
          variants: node.type === 'COMPONENT_SET' ? componentSetVariantInfo(node.id) : [],
          variantCount: node.type === 'COMPONENT_SET' ? node.childIds.length : 0,
          hasConflicts: conflicts.length > 0,
          sourceLibraryKey: node.sourceLibraryKey,
          description: node.symbolDescription,
          docsUrl: node.symbolLinks[0]?.uri ?? null,
          pageId: page?.id ?? editor.state.currentPageId,
          pageName: page?.name ?? panels.page
        }
      })
      .sort((a, b) => a.name.localeCompare(b.name))
  })

  const filteredAssets = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) return assets
    return assets.filter((asset) => asset.name.toLowerCase().includes(normalized))
  }, [assets, query])

  const assetGroups = useMemo<AssetGroup[]>(() => {
    const groups = new Map<string, AssetGroup>()
    for (const asset of filteredAssets) {
      const group = groups.get(asset.pageId) ?? {
        pageId: asset.pageId,
        pageName: asset.pageName,
        assets: []
      }
      group.assets.push(asset)
      groups.set(asset.pageId, group)
    }
    return [...groups.values()].sort((a, b) => a.pageName.localeCompare(b.pageName))
  }, [filteredAssets])

  const selectedAsset = useMemo(
    () => assets.find((asset) => asset.id === selectedAssetId) ?? null,
    [assets, selectedAssetId]
  )
  const SelectedAssetIcon = selectedAsset ? nodeIcon(selectedAsset.node) : null

  // Fetch a larger preview render for the details dialog whenever it opens or
  // the selected asset / scene changes. Mirrors AssetThumbnail's fetch pattern
  // but at a bigger, fixed box size matching the dialog layout.
  useEffect(() => {
    let active = true
    let objectUrl: string | null = null
    const nodeId = selectedAsset?.componentId ?? null
    if (!detailsOpen || !nodeId) {
      setPreviewUrl(null)
      return
    }
    const node = editor.graph.getNode(nodeId)
    if (!node) {
      setPreviewUrl(null)
      return
    }
    setPreviewLoading(true)
    const maxSize = Math.max(node.width, node.height, 1)
    const scale = Math.min(176 / maxSize, 2)
    void editor
      .renderExportImage([nodeId], scale, 'PNG', selectedAsset?.pageId)
      .then((data) => {
        if (!active) return
        if (data) {
          objectUrl = URL.createObjectURL(new Blob([new Uint8Array(data)], { type: 'image/png' }))
          setPreviewUrl(objectUrl)
        } else {
          setPreviewUrl(null)
        }
        return undefined
      })
      .catch(() => {
        if (active) setPreviewUrl(null)
      })
      .then(() => {
        if (active) setPreviewLoading(false)
      })
    return () => {
      active = false
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [editor, detailsOpen, selectedAsset?.componentId, selectedAsset?.pageId, sceneVersion])

  function insertionPoint(component: SceneNode, parentId: string) {
    const canvasCenter = editor.viewportCanvasCenter()
    const center = editor.screenToCanvas(canvasCenter.x, canvasCenter.y)
    const parentOffset =
      parentId === editor.state.currentPageId
        ? { x: 0, y: 0 }
        : editor.graph.getAbsolutePosition(parentId)
    return {
      x: center.x - parentOffset.x - component.width / 2,
      y: center.y - parentOffset.y - component.height / 2
    }
  }

  function insertAsset(asset: LocalAsset) {
    if (!asset.componentId) return
    const component = editor.graph.getNode(asset.componentId)
    if (!component) return
    const parentId = editor.state.enteredContainerId ?? editor.state.currentPageId
    const point = insertionPoint(component, parentId)
    editor.createInstanceFromComponent(asset.componentId, point.x, point.y, parentId)
    editor.requestRender()
  }

  function onDragStart(event: React.DragEvent, asset: LocalAsset) {
    if (!event.dataTransfer || !asset.componentId) return
    event.dataTransfer.setData('application/x-openweave-component', asset.componentId)
    event.dataTransfer.effectAllowed = 'copy'
  }

  function openDetails(asset: LocalAsset) {
    setSelectedAssetId(asset.id)
    setDetailsOpen(true)
  }

  function focusAsset(asset: LocalAsset) {
    void editor.focusComponent(asset.id)
  }

  function onAssetKeydown(event: React.KeyboardEvent, asset: LocalAsset) {
    if ((event.metaKey || event.ctrlKey) && event.code === 'Enter') {
      event.preventDefault()
      openDetails(asset)
      return
    }
    if (event.code === 'Enter' || event.code === 'Space') {
      event.preventDefault()
      insertAsset(asset)
    }
  }

  function insertSelectedAsset() {
    if (!selectedAsset) return
    insertAsset(selectedAsset)
    setDetailsOpen(false)
  }

  return (
    <section
      data-test-id="assets-panel"
      className="flex min-h-0 flex-1 flex-col overflow-hidden"
    >
      <div className="flex shrink-0 items-center gap-2 px-2 py-2">
        <input
          type="search"
          data-test-id="assets-search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={panels.searchLocalComponents}
          className="min-w-0 flex-1 rounded border border-border bg-input/50 px-2 py-1 text-xs text-surface outline-none placeholder:text-muted focus:border-accent"
        />
        <div className="flex shrink-0 rounded border border-border" role="group" aria-label={panels.assetView}>
          <Tip label={panels.gridView}>
            <button
              type="button"
              data-test-id="assets-view-grid"
              aria-label={panels.gridView}
              aria-pressed={assetView === 'grid'}
              className="flex size-7 shrink-0 items-center justify-center rounded text-muted transition-colors hover:bg-hover hover:text-surface aria-pressed:bg-input aria-pressed:text-surface"
              onClick={() => setAssetView('grid')}
            >
              <LayoutGrid className="size-4" />
            </button>
          </Tip>
          <Tip label={panels.listView}>
            <button
              type="button"
              data-test-id="assets-view-list"
              aria-label={panels.listView}
              aria-pressed={assetView === 'list'}
              className="flex size-7 shrink-0 items-center justify-center rounded text-muted transition-colors hover:bg-hover hover:text-surface aria-pressed:bg-input aria-pressed:text-surface"
              onClick={() => setAssetView('list')}
            >
              <List className="size-4" />
            </button>
          </Tip>
        </div>
      </div>

      <div className="scrollbar-thin flex min-h-0 flex-1 flex-col overflow-y-auto px-2 pb-2">
        {assetGroups.map((group) => (
          <section key={group.pageId} className="mb-3">
            <h2 className="mb-1 px-1 text-[10px] font-medium uppercase tracking-wide text-muted">
              {group.pageName}
            </h2>
            <div className={assetView === 'grid' ? 'grid grid-cols-2 gap-2' : 'flex flex-col gap-0.5'}>
              {group.assets.map((asset) => {
                const NodeIconComp = nodeIcon(asset.node)
                return (
                  <ContextMenu.Root key={asset.id} modal={false}>
                    <ContextMenu.Trigger asChild>
                      <div
                        role="button"
                        tabIndex={0}
                        data-test-id="asset-item"
                        data-asset-id={asset.id}
                        draggable={Boolean(asset.componentId)}
                        className={`group/asset rounded text-left text-xs text-surface outline-none hover:bg-hover focus-visible:ring-1 focus-visible:ring-accent ${
                          assetView === 'grid'
                            ? 'flex min-w-0 flex-col items-center gap-1 p-1.5'
                            : 'flex w-full items-center gap-2 px-1.5 py-1'
                        }`}
                        onClick={() => openDetails(asset)}
                        onKeyDown={(e) => onAssetKeydown(e, asset)}
                        onDragStart={(e) => onDragStart(e, asset)}
                      >
                        {asset.componentId ? (
                          <AssetThumbnail
                            nodeId={asset.componentId}
                            alt={`${asset.name} preview`}
                            size={assetView === 'grid' ? ASSET_GRID_THUMBNAIL_SIZE : ASSET_LIST_THUMBNAIL_SIZE}
                          />
                        ) : (
                          <NodeIconComp className="size-4 shrink-0 text-component" aria-hidden="true" />
                        )}
                        <span className={assetView === 'grid' ? 'w-full min-w-0' : 'min-w-0 flex-1'}>
                          <span className="flex min-w-0 items-center gap-1">
                            <span data-test-id="asset-name" className="truncate">
                              {asset.name}
                            </span>
                            {asset.sourceLibraryKey ? (
                              <span
                                data-test-id="asset-library-badge"
                                className="shrink-0 rounded bg-component/15 px-1 py-px text-[9px] font-medium uppercase text-component"
                              >
                                {panels.assetLibraryBadge}
                              </span>
                            ) : null}
                          </span>
                          {assetView === 'list' && asset.variants.length > 0 ? (
                            <span
                              data-test-id="asset-variant-summary"
                              className="mt-0.5 block truncate text-[10px] text-muted"
                            >
                              {panels.assetVariantSummary({
                                count: String(asset.variantCount),
                                names: asset.variants.map((variant) => variant.name).join(', ')
                              })}
                            </span>
                          ) : null}
                          {assetView === 'list' && asset.description ? (
                            <span
                              data-test-id="asset-description"
                              className="mt-0.5 block truncate text-[10px] text-muted"
                            >
                              {asset.description}
                            </span>
                          ) : null}
                          {assetView === 'list' && asset.hasConflicts ? (
                            <span
                              data-test-id="asset-variant-conflict"
                              className="mt-0.5 block truncate text-[10px] text-warning-text"
                            >
                              {panels.duplicateVariantValues}
                            </span>
                          ) : null}
                        </span>
                        {assetView === 'list' ? (
                          <div className="flex shrink-0 items-center">
                            {asset.docsUrl ? (
                              <Tip label={panels.openDocumentation}>
                                <button
                                  type="button"
                                  data-test-id="asset-docs"
                                  className="flex size-6 shrink-0 items-center justify-center rounded text-muted hover:bg-hover hover:text-surface"
                                  onPointerDown={(e) => e.stopPropagation()}
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    if (asset.docsUrl) void openExternalLink(asset.docsUrl)
                                  }}
                                >
                                  <BookOpen className="size-3" />
                                </button>
                              </Tip>
                            ) : null}
                            <Tip label={panels.insertInstance}>
                              <button
                                type="button"
                                data-test-id="asset-insert"
                                className="flex size-6 shrink-0 items-center justify-center rounded text-muted hover:bg-hover hover:text-surface"
                                onPointerDown={(e) => e.stopPropagation()}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  insertAsset(asset)
                                }}
                              >
                                <Plus className="size-4" />
                              </button>
                            </Tip>
                          </div>
                        ) : null}
                      </div>
                    </ContextMenu.Trigger>
                    <ContextMenu.Portal>
                      <ContextMenu.Content className={contextMenuCls.content}>
                        <ContextMenu.Item
                          data-test-id="asset-context-go-to-main"
                          className={contextMenuCls.item}
                          onSelect={() => focusAsset(asset)}
                        >
                          {panels.goToMainComponent}
                        </ContextMenu.Item>
                        <ContextMenu.Item
                          data-test-id="asset-context-view-details"
                          className={contextMenuCls.item}
                          onSelect={() => openDetails(asset)}
                        >
                          {panels.viewDetails}
                        </ContextMenu.Item>
                      </ContextMenu.Content>
                    </ContextMenu.Portal>
                  </ContextMenu.Root>
                )
              })}
            </div>
          </section>
        ))}

        {filteredAssets.length === 0 ? (
          <div
            data-test-id="assets-empty"
            className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center text-muted"
          >
            <ComponentIcon className="size-5" />
            <span className="text-xs">{panels.noLocalComponents}</span>
          </div>
        ) : null}
      </div>

      {selectedAsset ? (
        <AppDialogRoot
          size="lg"
          open={detailsOpen}
          onOpenChange={setDetailsOpen}
          data-test-id="asset-details-dialog"
        >
          <AppDialogHeader
            closeLabel={dialogs.close}
            closeTestId="asset-details-close"
            heading={
              <span className="flex min-w-0 items-center gap-2">
                {SelectedAssetIcon ? (
                  <SelectedAssetIcon className="size-4 shrink-0 text-component" aria-hidden="true" />
                ) : null}
                <span className="truncate">{selectedAsset.name}</span>
              </span>
            }
            description={
              <>
                {selectedAsset.node.type === 'COMPONENT_SET' ? panels.componentSet : panels.component}
                {selectedAsset.variantCount > 0 ? ` · ${selectedAsset.variantCount} variants` : ''}
              </>
            }
          />

          <div className="grid min-h-0 flex-1 grid-cols-[260px_1fr] gap-0 overflow-y-auto">
            <div className="border-r border-border p-4">
              <div
                data-test-id="asset-details-preview"
                className="flex h-36 items-center justify-center overflow-hidden rounded-lg border border-border bg-canvas/60"
              >
                {previewUrl ? (
                  <img
                    data-test-id="asset-details-preview-image"
                    src={previewUrl}
                    alt={`${selectedAsset.name} preview`}
                    className="max-h-[120px] max-w-[210px] object-contain"
                  />
                ) : (
                  <div className="text-center">
                    {previewLoading ? (
                      <Loader2 className="mx-auto size-5 animate-spin text-muted" />
                    ) : (
                      SelectedAssetIcon && <SelectedAssetIcon className="mx-auto size-8 text-component" />
                    )}
                    <p className="mt-2 max-w-44 truncate text-xs font-medium text-surface">
                      {selectedAsset.name}
                    </p>
                  </div>
                )}
              </div>
              <button
                type="button"
                data-test-id="asset-details-insert"
                className={`mt-3 w-full ${insertButtonCls}`}
                onClick={insertSelectedAsset}
              >
                {panels.insertInstance}
              </button>
            </div>

            <div className="min-w-0 p-4">
              {selectedAsset.description ? (
                <section className="mb-4">
                  <h3 className="text-[11px] font-medium uppercase tracking-wider text-muted">
                    {panels.description}
                  </h3>
                  <p data-test-id="asset-details-description" className="mt-1 text-xs leading-5 text-surface">
                    {selectedAsset.description}
                  </p>
                </section>
              ) : null}

              {selectedAsset.sourceLibraryKey ? (
                <section className="mb-4">
                  <h3 className="text-[11px] font-medium uppercase tracking-wider text-muted">
                    {panels.assetLibraryBadge}
                  </h3>
                  <p data-test-id="asset-details-library" className="mt-1 break-all text-xs text-muted">
                    {selectedAsset.sourceLibraryKey}
                  </p>
                </section>
              ) : null}

              {selectedAsset.docsUrl ? (
                <section className="mb-4">
                  <h3 className="text-[11px] font-medium uppercase tracking-wider text-muted">
                    {panels.documentation}
                  </h3>
                  <button
                    type="button"
                    data-test-id="asset-details-docs"
                    className="mt-1 inline-flex items-center gap-1 rounded px-1 py-0.5 text-xs text-component hover:bg-component/10"
                    onClick={() => {
                      if (selectedAsset.docsUrl) void openExternalLink(selectedAsset.docsUrl)
                    }}
                  >
                    <BookOpen className="size-3" />
                    {panels.openDocs}
                  </button>
                </section>
              ) : null}

              {selectedAsset.variants.length > 0 ? (
                <section>
                  <h3 className="text-[11px] font-medium uppercase tracking-wider text-muted">
                    {panels.properties}
                  </h3>
                  <div className="mt-2 flex flex-col gap-2">
                    {selectedAsset.variants.map((variant) => (
                      <div
                        key={variant.name}
                        data-test-id="asset-details-property"
                        className="rounded border border-border bg-input/40 px-2 py-1.5"
                      >
                        <div className="text-xs font-medium text-surface">{variant.name}</div>
                        <div className="mt-1 text-[11px] text-muted">{variant.values.join(', ')}</div>
                      </div>
                    ))}
                  </div>
                </section>
              ) : null}
            </div>
          </div>
        </AppDialogRoot>
      ) : null}
    </section>
  )
}
