import React, { useEffect, useMemo, useState } from 'react'
import { LayoutGrid, List, Plus, Component as ComponentIcon } from 'lucide-react'
import { useI18n } from '@openweave/react'
import type { SceneNode } from '@openweave/scene-graph'

import { useEditorStore } from '@/app/editor/active-store'
import { useSceneComputed } from '@openweave/react'
import { nodeIcon } from '@/app/editor/icons'
import { findAssetPage } from '@/components/assets-panel/page'
import {
  ASSET_GRID_THUMBNAIL_SIZE,
  ASSET_LIST_THUMBNAIL_SIZE,
  ASSET_THUMBNAIL_RENDER_SCALE
} from '@/constants'

type AssetView = 'grid' | 'list'

type LocalAsset = {
  id: string
  name: string
  node: SceneNode
  componentId: string | null
  variantCount: number
  sourceLibraryKey: string | null
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

  useEffect(() => {
    let active = true
    let objectUrl: string | null = null
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
        if (data) {
          objectUrl = URL.createObjectURL(new Blob([new Uint8Array(data)], { type: 'image/png' }))
          setUrl(objectUrl)
        } else {
          setUrl(null)
        }
        return undefined
      })
      .catch(() => {
        if (active) setUrl(null)
      })
    return () => {
      active = false
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [editor, nodeId, size, sceneVersion])

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
  const { panels } = useI18n()
  const [query, setQuery] = useState('')
  const [assetView, setAssetView] = useState<AssetView>('grid')

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
        return {
          id: node.id,
          name: node.name,
          node,
          componentId: defaultVariant?.id ?? null,
          variantCount: node.type === 'COMPONENT_SET' ? node.childIds.length : 0,
          sourceLibraryKey: node.sourceLibraryKey,
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

  function insertAsset(asset: LocalAsset) {
    if (!asset.componentId) return
    const component = editor.graph.getNode(asset.componentId)
    if (!component) return
    const parentId = editor.state.enteredContainerId ?? editor.state.currentPageId
    const canvasCenter = editor.viewportCanvasCenter()
    const center = editor.screenToCanvas(canvasCenter.x, canvasCenter.y)
    const parentOffset =
      parentId === editor.state.currentPageId
        ? { x: 0, y: 0 }
        : editor.graph.getAbsolutePosition(parentId)
    const x = center.x - parentOffset.x - component.width / 2
    const y = center.y - parentOffset.y - component.height / 2
    editor.createInstanceFromComponent(asset.componentId, x, y, parentId)
    editor.requestRender()
  }

  function onDragStart(event: React.DragEvent, asset: LocalAsset) {
    if (!event.dataTransfer || !asset.componentId) return
    event.dataTransfer.setData('application/x-openweave-component', asset.componentId)
    event.dataTransfer.effectAllowed = 'copy'
  }

  function onAssetKeydown(event: React.KeyboardEvent, asset: LocalAsset) {
    if (event.code === 'Enter' || event.code === 'Space') {
      event.preventDefault()
      insertAsset(asset)
    }
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
          <button
            type="button"
            data-test-id="assets-view-grid"
            title={panels.gridView}
            aria-pressed={assetView === 'grid'}
            className={`flex size-6 items-center justify-center rounded-l ${
              assetView === 'grid' ? 'bg-hover text-surface' : 'text-muted hover:text-surface'
            }`}
            onClick={() => setAssetView('grid')}
          >
            <LayoutGrid className="size-3" />
          </button>
          <button
            type="button"
            data-test-id="assets-view-list"
            title={panels.listView}
            aria-pressed={assetView === 'list'}
            className={`flex size-6 items-center justify-center rounded-r ${
              assetView === 'list' ? 'bg-hover text-surface' : 'text-muted hover:text-surface'
            }`}
            onClick={() => setAssetView('list')}
          >
            <List className="size-3" />
          </button>
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
                  <div
                    key={asset.id}
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
                    onClick={() => insertAsset(asset)}
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
                      {assetView === 'list' && asset.variantCount > 0 ? (
                        <span className="mt-0.5 block truncate text-[10px] text-muted">
                          {panels.componentSet} · {asset.variantCount}
                        </span>
                      ) : null}
                    </span>
                    {assetView === 'list' ? (
                      <button
                        type="button"
                        data-test-id="asset-insert"
                        title={panels.insertInstance}
                        className="flex size-6 shrink-0 items-center justify-center rounded text-muted hover:bg-hover hover:text-surface"
                        onClick={(e) => {
                          e.stopPropagation()
                          insertAsset(asset)
                        }}
                      >
                        <Plus className="size-3" />
                      </button>
                    ) : null}
                  </div>
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
    </section>
  )
}
