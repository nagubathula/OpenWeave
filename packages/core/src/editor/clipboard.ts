import {
  duplicateNodeName,
  type SceneNode,
  type Variable,
  type VariableCollection
} from '@openweave/scene-graph'
import type { Vector } from '@openweave/scene-graph/primitives'

import { importClipboardNodes, parseFigmaClipboard, parseOpenWeaveClipboard } from '#core/clipboard'
import { computeAllLayouts } from '#core/layout'

import { createClipboardAssetActions } from './clipboard/assets'
import { createClipboardCopyActions } from './clipboard/copy'
import { createClipboardExportActions } from './clipboard/export'
import { createClipboardFontActions } from './clipboard/fonts'
import { deleteIds, recreateSnapshots, restoreDeletedEntries } from './clipboard/history'
import { replaceTargetsWithCreated, selectedReplacementTargets } from './clipboard/paste-replace'
import { resolvePasteTarget } from './clipboard/paste-target'
import { createClipboardPlacementActions } from './clipboard/placement'
import { createClipboardPropertiesActions } from './clipboard/properties'
import { collectSubtrees, restoreSubtree, snapshotSubtree } from './clipboard/subtree-history'
import { ensureUniqueVariantValues } from './components/variants'
import type { EditorContext } from './types'

type PasteOptions = {
  replaceSelection?: boolean
}

export function createClipboardActions(
  ctx: EditorContext,
  updateNodeWithUndo: (id: string, changes: Partial<SceneNode>, label?: string) => void
) {
  function duplicateSelected(selectedNodes: SceneNode[]) {
    const prevSelection = new Set(ctx.state.selectedIds)
    const selectedSet = new Set(selectedNodes.map((n) => n.id))
    const topLevel = selectedNodes.filter((n) => !n.parentId || !selectedSet.has(n.parentId))

    const newRootIds: string[] = []
    const allSnapshots = new Map<string, SceneNode>()

    for (const node of topLevel) {
      const parentId = node.parentId ?? ctx.state.currentPageId
      const clone = ctx.graph.cloneTree(node.id, parentId, {
        name: duplicateNodeName(ctx.graph, node.name, parentId),
        x: node.x + 20,
        y: node.y + 20
      })
      if (!clone) continue
      // A duplicated variant gets a unique value combination instead of
      // landing in its set as a conflict (before the undo snapshot, so
      // redo restores the fixed values).
      ensureUniqueVariantValues(ctx, clone.id)
      newRootIds.push(clone.id)
      const subtree = snapshotSubtree(ctx.graph, clone.id)
      for (const [id, snap] of subtree) allSnapshots.set(id, snap)
    }

    if (newRootIds.length > 0) {
      ctx.setSelectedIds(new Set(newRootIds))
      ctx.undo.push({
        label: 'Duplicate',
        forward: () => {
          for (const rootId of newRootIds) {
            const snapshot = allSnapshots.get(rootId)
            if (!snapshot) continue
            const parentId = snapshot.parentId ?? ctx.state.currentPageId
            restoreSubtree(ctx.graph, snapshot, parentId, allSnapshots)
          }
          ctx.setSelectedIds(new Set(newRootIds))
        },
        inverse: () => {
          for (const id of newRootIds.slice().reverse()) ctx.graph.deleteNode(id)
          ctx.setSelectedIds(prevSelection)
        }
      })
    }
  }

  function pushCreatedNodesUndo(created: string[], prevSelection: Set<string>, label = 'Paste') {
    const allNodes = collectSubtrees(ctx.graph, created)
    const pageId = ctx.state.currentPageId
    ctx.undo.push({
      label,
      forward: () => {
        recreateSnapshots(ctx, allNodes, pageId)
        computeAllLayouts(ctx.graph, pageId)
        ctx.setSelectedIds(new Set(created))
      },
      inverse: () => {
        deleteIds(ctx, created)
        computeAllLayouts(ctx.graph, pageId)
        ctx.setSelectedIds(prevSelection)
      }
    })
  }

  async function pasteFromHTML(html: string, cursorPos?: Vector, options: PasteOptions = {}) {
    const openWeave = parseOpenWeaveClipboard(html)
    if (openWeave) {
      const created = pasteOpenWeaveNodes(
        openWeave.nodes,
        openWeave.images,
        openWeave.variables,
        openWeave.variableCollections,
        cursorPos,
        options
      )
      await fontActions.loadFontsForNodes(created)
      return
    }

    const figma = await parseFigmaClipboard(html)
    if (figma === 'too-large') {
      ctx.emitEditorEvent('clipboard:paste-failed', { reason: 'too-large' })
      return
    }
    if (figma) {
      const prevSelection = new Set(ctx.state.selectedIds)
      const replacementTargets = options.replaceSelection ? selectedReplacementTargets(ctx) : []
      const pasteTarget = replacementTargets[0]?.parentId ?? resolvePasteTarget(ctx)
      const created = importClipboardNodes(figma.nodes, ctx.graph, pasteTarget, 0, 0, figma.blobs)
      if (created.length === 0) return

      if (replacementTargets.length > 0) {
        replaceTargetsWithCreated(
          ctx,
          placementActions.centerNodesAt,
          created,
          replacementTargets,
          prevSelection
        )
      } else {
        const { width: viewW, height: viewH } = ctx.getViewportSize()
        const cx = cursorPos?.x ?? (-ctx.state.panX + viewW / 2) / ctx.state.zoom
        const cy = cursorPos?.y ?? (-ctx.state.panY + viewH / 2) / ctx.state.zoom
        placementActions.centerNodesAt(created, cx, cy)
        computeAllLayouts(ctx.graph, ctx.state.currentPageId)
        ctx.setSelectedIds(new Set(created))
        pushCreatedNodesUndo(created, prevSelection)
      }

      // Defer image/font loading and render to the next macrotask so the browser
      // can run GC after the synchronous node-creation work before allocating
      // more memory for font data, Figma images, and CanvasKit paint operations.
      setTimeout(async () => {
        await Promise.all([
          hydrateFigmaClipboardImages(figma.meta.fileKey, created),
          fontActions.loadFontsForNodes(created)
        ])
        ctx.requestRender()
      }, 0)
    }
  }

  function pasteOpenWeaveNodes(
    nodes: Array<SceneNode & { children?: SceneNode[] }>,
    images: Map<string, Uint8Array>,
    variables?: Variable[],
    variableCollections?: VariableCollection[],
    cursorPos?: Vector,
    options: PasteOptions = {}
  ) {
    const prevSelection = new Set(ctx.state.selectedIds)
    const replacementTargets = options.replaceSelection ? selectedReplacementTargets(ctx) : []
    for (const [hash, bytes] of images) ctx.graph.images.set(hash, bytes)

    if (variableCollections) {
      for (const col of variableCollections) {
        if (!ctx.graph.variableCollections.has(col.id)) {
          ctx.graph.addCollection(col)
        }
      }
    }
    if (variables) {
      for (const v of variables) {
        if (!ctx.graph.variables.has(v.id)) {
          ctx.graph.addVariable(v)
        }
      }
    }

    const created: string[] = []
    const idMap = new Map<string, string>()
    const createNodeTree = (source: SceneNode & { children?: SceneNode[] }, parentId: string) => {
      const {
        id: sourceId,
        childIds: _childIds,
        children = [],
        parentId: _parentId,
        ...rest
      } = source
      const node = ctx.graph.createNode(source.type, parentId, {
        ...structuredClone(rest),
        x: source.x + 20,
        y: source.y + 20,
        childIds: []
      })
      idMap.set(sourceId, node.id)
      for (const child of children) createNodeTree(child, node.id)
      return node.id
    }

    const pasteTarget = replacementTargets[0]?.parentId ?? resolvePasteTarget(ctx)
    for (const node of nodes) created.push(createNodeTree(node, pasteTarget))
    if (created.length === 0) return created

    for (const [, newId] of idMap) {
      const node = ctx.graph.getNode(newId)
      if (!node) continue
      if (node.componentId && idMap.has(node.componentId)) {
        ctx.graph.updateNode(newId, { componentId: idMap.get(node.componentId) })
      }
      if (node.overrides && Object.keys(node.overrides).length > 0) {
        let overridesChanged = false
        const newOverrides: Record<string, unknown> = {}
        for (const [key, val] of Object.entries(node.overrides)) {
          const colonIdx = key.indexOf(':')
          if (colonIdx > 0) {
            const targetId = key.slice(0, colonIdx)
            const prop = key.slice(colonIdx + 1)
            const remappedTarget = idMap.get(targetId) ?? targetId
            const remappedVal =
              prop === 'sourceComponentId' && typeof val === 'string' && idMap.has(val)
                ? idMap.get(val)
                : val
            newOverrides[`${remappedTarget}:${prop}`] = remappedVal
            if (remappedTarget !== targetId || remappedVal !== val) {
              overridesChanged = true
            }
          } else {
            newOverrides[key] = val
          }
        }
        if (overridesChanged) {
          ctx.graph.updateNode(newId, { overrides: newOverrides })
        }
      }
    }

    if (replacementTargets.length > 0) {
      replaceTargetsWithCreated(
        ctx,
        placementActions.centerNodesAt,
        created,
        replacementTargets,
        prevSelection
      )
      return created
    }

    if (cursorPos) placementActions.centerNodesAt(created, cursorPos.x, cursorPos.y)
    computeAllLayouts(ctx.graph, ctx.state.currentPageId)
    ctx.setSelectedIds(new Set(created))

    pushCreatedNodesUndo(created, prevSelection)
    return created
  }

  function missingImageHashes(nodeIds: string[]) {
    const hashes = new Set<string>()
    for (const node of collectSubtrees(ctx.graph, nodeIds)) {
      for (const fill of node.fills) {
        if (fill.type === 'IMAGE' && fill.imageHash && !ctx.graph.images.has(fill.imageHash)) {
          hashes.add(fill.imageHash)
        }
      }
    }
    return [...hashes]
  }

  async function hydrateFigmaClipboardImages(fileKey: string, nodeIds: string[]) {
    const hashes = missingImageHashes(nodeIds)
    if (hashes.length === 0) return

    const resolver = ctx.resolveFigmaClipboardImages
    if (resolver) {
      try {
        const images = await resolver(fileKey, hashes)
        for (const hash of hashes) {
          const bytes = images.get(hash)
          if (bytes) ctx.graph.images.set(hash, bytes)
        }
      } catch (error) {
        console.warn('Failed to fetch Figma clipboard images', error)
      }
    }

    const missing = missingImageHashes(nodeIds).length
    if (missing > 0) {
      ctx.emitEditorEvent('clipboard:images-missing', {
        total: hashes.length,
        missing,
        fetchAttempted: resolver !== null
      })
    }
  }

  function warnMissingImages(nodeIds: string[]) {
    return missingImageHashes(nodeIds).length > 0
  }

  function deleteSelected() {
    const entries: Array<{
      id: string
      parentId: string
      index: number
      subtree: Map<string, SceneNode>
    }> = []
    for (const id of ctx.state.selectedIds) {
      const node = ctx.graph.getNode(id)
      if (!node || node.locked) continue
      const parentId = node.parentId ?? ctx.state.currentPageId
      const parent = ctx.graph.getNode(parentId)
      const index = parent?.childIds.indexOf(id) ?? -1
      entries.push({ id, parentId, index, subtree: snapshotSubtree(ctx.graph, id) })
    }
    if (entries.length === 0) return

    const relayoutParents = () => {
      for (const parentId of new Set(entries.map((entry) => entry.parentId))) {
        ctx.runLayoutForNode(parentId)
      }
    }

    const prevSelection = new Set(ctx.state.selectedIds)
    for (const { id } of entries) ctx.graph.deleteNode(id)
    relayoutParents()

    ctx.undo.push({
      label: 'Delete',
      forward: () => {
        for (const { id } of entries) ctx.graph.deleteNode(id)
        relayoutParents()
        ctx.setSelectedIds(new Set())
      },
      inverse: () => {
        restoreDeletedEntries(ctx, entries)
        relayoutParents()
        ctx.setSelectedIds(prevSelection)
      }
    })
    ctx.setSelectedIds(new Set())
  }

  const copyActions = createClipboardCopyActions(ctx)
  const exportActions = createClipboardExportActions(ctx)
  const fontActions = createClipboardFontActions(ctx)
  const assetActions = createClipboardAssetActions(ctx, pushCreatedNodesUndo)
  const placementActions = createClipboardPlacementActions(ctx)
  const propertiesActions = createClipboardPropertiesActions(ctx, updateNodeWithUndo)

  return {
    collectSubtrees,
    ...placementActions,
    ...fontActions,
    duplicateSelected,
    ...copyActions,
    ...propertiesActions,
    pasteFromHTML,
    warnMissingImages,
    deleteSelected,
    ...assetActions,
    ...exportActions
  }
}
