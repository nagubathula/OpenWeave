import { isNotNil } from 'es-toolkit/predicate'

import { populateAndApplyOverrides } from '@openweave/fig/instance-overrides'
import type { InstanceNodeChange } from '@openweave/fig/instance-overrides'
import {
  applyStyleRefsToFields,
  guidToString,
  nodeChangeToProps,
  shouldImportTextAsAutoSize,
  sortChildren,
  setVariableColorResolver
} from '@openweave/fig/node-change'
import type { NodeChange } from '@openweave/kiwi/fig/codec'
import { SceneGraph } from '@openweave/scene-graph'
import type { DeviceRotation, PrototypeDeviceType, Vector } from '@openweave/scene-graph'

import { setLazyFigImportContext } from '#core/kiwi/fig/lazy-import'

import {
  buildAssetRefMap,
  buildVariableColorResolver,
  importCollections,
  importVariableBindings,
  importVariableEntries
} from './variables'

function applyImportedCanvasMetadata(
  page: ReturnType<SceneGraph['addPage']>,
  canvasNc: NodeChange
) {
  page.source.format = 'fig'
  page.source.orderKey = canvasNc.parentIndex?.position ?? null
  if (canvasNc.backgroundColor)
    page.source.fig.rawNodeFields.backgroundColor = structuredClone(canvasNc.backgroundColor)
  if (canvasNc.backgroundPaints)
    page.source.fig.rawNodeFields.backgroundPaints = structuredClone(canvasNc.backgroundPaints)
  if (canvasNc.guides) page.source.fig.rawNodeFields.guides = structuredClone(canvasNc.guides)
  page.source.fig.rawNodeFields.strokeJoin = canvasNc.strokeJoin
  page.source.fig.rawNodeFields.strokeWeight = canvasNc.strokeWeight
  if (canvasNc.pageType) page.source.fig.rawNodeFields.pageType = canvasNc.pageType
  if (canvasNc.prototypeStartNodeID) {
    // Stored as the GUID string for now; remapPrototypeIds resolves it to the
    // created node id once every node exists.
    page.prototypeStartNodeId = guidToString(canvasNc.prototypeStartNodeID)
  }
  if (canvasNc.prototypeDevice) {
    page.prototypeDevice = {
      type: (canvasNc.prototypeDevice as { type?: PrototypeDeviceType }).type ?? 'NONE',
      size: (canvasNc.prototypeDevice as { size?: Vector }).size,
      presetIdentifier:
        (canvasNc.prototypeDevice as { presetIdentifier?: string }).presetIdentifier ?? '',
      rotation: (canvasNc.prototypeDevice as { rotation?: DeviceRotation }).rotation ?? 'NONE'
    }
  }
}

function applyImportedDocumentMetadata(graph: SceneGraph, docNc: NodeChange | undefined) {
  const rootNode = graph.getNode(graph.rootId)
  if (!docNc || !rootNode) return
  rootNode.source.format = 'fig'
  rootNode.source.fig.rawNodeFields.strokeJoin = docNc.strokeJoin
  rootNode.source.fig.rawNodeFields.strokeWeight = docNc.strokeWeight
}

interface ChangeMaps {
  changeMap: Map<string, NodeChange>
  parentMap: Map<string, string>
  childrenMap: Map<string, string[]>
}

function buildChangeMaps(nodeChanges: NodeChange[]): ChangeMaps {
  const changeMap = new Map<string, NodeChange>()
  const parentMap = new Map<string, string>()
  const childrenMap = new Map<string, string[]>()

  for (const nc of nodeChanges) {
    if (!nc.guid) continue
    if (nc.phase === 'REMOVED') continue
    const id = guidToString(nc.guid)
    changeMap.set(id, nc)

    if (nc.parentIndex?.guid) {
      const pid = guidToString(nc.parentIndex.guid)
      parentMap.set(id, pid)
      let siblings = childrenMap.get(pid)
      if (!siblings) {
        siblings = []
        childrenMap.set(pid, siblings)
      }
      siblings.push(id)
    }
  }

  for (const [parentId, children] of childrenMap) {
    const parentNc = changeMap.get(parentId)
    if (parentNc) sortChildren(children, parentNc, changeMap)
  }

  return { changeMap, parentMap, childrenMap }
}

function importPages(
  graph: SceneGraph,
  changeMap: Map<string, NodeChange>,
  parentMap: Map<string, string>,
  childrenMap: Map<string, string[]>,
  created: Set<string>,
  canvasIdToPageId: Map<string, string>,
  createSceneNode: (ncId: string, graphParentId: string) => void
): void {
  let docId: string | null = null
  for (const [id, nc] of changeMap) {
    if (nc.type === 'DOCUMENT' || id === '0:0') {
      docId = id
      break
    }
  }

  if (docId) {
    applyImportedDocumentMetadata(graph, changeMap.get(docId))

    for (const canvasId of childrenMap.get(docId) ?? []) {
      const canvasNc = changeMap.get(canvasId)
      if (!canvasNc) continue
      if (canvasNc.type === 'CANVAS') {
        const page = graph.addPage(canvasNc.name ?? 'Page')
        page.source.id = canvasId
        applyImportedCanvasMetadata(page, canvasNc)
        canvasIdToPageId.set(canvasId, page.id)
        if (canvasNc.internalOnly) page.internalOnly = true
        created.add(canvasId)
        for (const childId of childrenMap.get(canvasId) ?? []) {
          createSceneNode(childId, page.id)
        }
      } else {
        createSceneNode(canvasId, graph.getPages()[0]?.id ?? graph.rootId)
      }
    }
  } else {
    const roots: string[] = []
    for (const [id] of changeMap) {
      const pid = parentMap.get(id)
      if (!pid || !changeMap.has(pid)) roots.push(id)
    }
    const page = graph.getPages()[0] ?? graph.addPage('Page 1')
    for (const rootId of roots) {
      createSceneNode(rootId, page.id)
    }
  }
}

function remapComponentIds(graph: SceneGraph, guidToNodeId: Map<string, string>): void {
  for (const node of graph.getAllNodes()) {
    if (node.type !== 'INSTANCE' || !node.componentId) continue
    const remapped = guidToNodeId.get(node.componentId)
    if (remapped) node.componentId = remapped
  }
}

const ACTIONS_WITH_DESTINATION = new Set([
  'NAVIGATE',
  'CHANGE_TO',
  'OPEN_OVERLAY',
  'SWAP_OVERLAY',
  'SCROLL_TO'
])

/** Prototype references are imported as GUID strings; remap them to graph ids. */
function remapPrototypeIds(graph: SceneGraph, guidToNodeId: Map<string, string>): void {
  for (const node of graph.getAllNodes()) {
    if (node.prototypeStartNodeId) {
      const remapped = guidToNodeId.get(node.prototypeStartNodeId)
      if (remapped) node.prototypeStartNodeId = remapped
    }
    if (node.reactions.length === 0) continue
    node.reactions = node.reactions.flatMap((reaction) => {
      if (!ACTIONS_WITH_DESTINATION.has(reaction.action)) return [reaction]
      const destinationId = reaction.destinationId
        ? (guidToNodeId.get(reaction.destinationId) ?? null)
        : null
      // A reaction whose destination did not import is dead weight.
      if (!destinationId) return []
      const patched: typeof reaction = { ...reaction, destinationId }
      if (reaction.action === 'OPEN_OVERLAY' || reaction.action === 'SWAP_OVERLAY') {
        const dest = graph.getNode(destinationId)
        if (dest?.overlayPosition && !patched.overlayPosition) {
          patched.overlayPosition = dest.overlayPosition
        }
        if (
          dest?.overlayCloseOnClickOutside !== undefined &&
          patched.overlayCloseOnClickOutside === undefined
        ) {
          patched.overlayCloseOnClickOutside = dest.overlayCloseOnClickOutside
        }
        if (
          dest?.overlayBackgroundScrim !== undefined &&
          patched.overlayBackgroundScrim === undefined
        ) {
          patched.overlayBackgroundScrim = dest.overlayBackgroundScrim
        }
        if (dest?.overlayBackgroundColor && !patched.overlayBackgroundColor) {
          patched.overlayBackgroundColor = dest.overlayBackgroundColor
        }
      }
      return [patched]
    })
  }
  for (const page of graph.getPages(true)) {
    if (page.prototypeStartNodeId) {
      const remapped = guidToNodeId.get(page.prototypeStartNodeId)
      if (remapped) page.prototypeStartNodeId = remapped
    } else {
      for (const childId of page.childIds) {
        const child = graph.getNode(childId)
        if (child?.prototypeStartingPoint) {
          page.prototypeStartNodeId = child.id
          break
        }
      }
    }
  }
}

function applyVariantPropSpecs(graph: SceneGraph): void {
  for (const node of graph.getAllNodes()) {
    if (node.type !== 'COMPONENT' || node.variantPropSpecs.length === 0 || !node.parentId) continue
    const parent = graph.getNode(node.parentId)
    if (parent?.type !== 'COMPONENT_SET') continue
    const defs = new Map(parent.componentPropertyDefinitions.map((def) => [def.id, def.name]))
    const values: Record<string, string> = {}
    for (const spec of node.variantPropSpecs)
      values[defs.get(spec.propDefId) ?? spec.propDefId] = spec.value
    graph.updateNode(node.id, { componentPropertyValues: values })
  }
}

function parseDocumentColorSpace(nodeChanges: NodeChange[]): 'srgb' | 'display-p3' {
  const documentNode = nodeChanges.find((nc) => nc.type === 'DOCUMENT')
  return documentNode?.documentColorProfile === 'DISPLAY_P3' ? 'display-p3' : 'srgb'
}

function applyStyleRefs(changeMap: Map<string, NodeChange>): void {
  for (const nc of changeMap.values()) applyStyleRefsToFields(changeMap, nc)
}

export interface FigImportOptions {
  populate?: 'all' | 'first-page' | 'none'
}

function rememberLazyFigImportContext(
  graph: SceneGraph,
  changeMap: Map<string, NodeChange>,
  guidToNodeId: Map<string, string>,
  blobs: Uint8Array[],
  populatedRootIds: string[]
): void {
  setLazyFigImportContext(graph, {
    changeMap: changeMap as Map<string, InstanceNodeChange>,
    guidToNodeId,
    blobs,
    populatedRootIds: new Set(populatedRootIds)
  })
}

function componentPageIdsForLazyPopulation(graph: SceneGraph): Set<string> {
  const pageIds = new Set<string>()
  for (const node of graph.getAllNodes()) {
    if (node.type !== 'COMPONENT' && node.type !== 'COMPONENT_SET') continue
    let current = node.parentId ? graph.getNode(node.parentId) : undefined
    while (current?.parentId && current.type !== 'CANVAS') {
      current = graph.getNode(current.parentId)
    }
    if (current?.type === 'CANVAS') pageIds.add(current.id)
  }
  return pageIds
}

export function importNodeChanges(
  nodeChanges: NodeChange[],
  blobs: Uint8Array[] = [],
  images?: Map<string, Uint8Array>,
  options: FigImportOptions = {}
): SceneGraph {
  const graph = new SceneGraph()
  graph.documentColorSpace = parseDocumentColorSpace(nodeChanges)

  if (images) {
    for (const [hash, data] of images) {
      graph.images.set(hash, data)
    }
  }

  for (const page of graph.getPages(true)) {
    graph.deleteNode(page.id)
  }

  const { changeMap, parentMap, childrenMap } = buildChangeMaps(nodeChanges)
  applyStyleRefs(changeMap)
  const assetRefs = buildAssetRefMap(changeMap)
  setVariableColorResolver(buildVariableColorResolver(changeMap, assetRefs))

  const canvasIdToPageId = new Map<string, string>()
  const created = new Set<string>()
  const guidToNodeId = new Map<string, string>()
  const getChildren = (ncId: string): string[] => childrenMap.get(ncId) ?? []

  function createSceneNode(ncId: string, graphParentId: string) {
    if (created.has(ncId)) return
    created.add(ncId)

    const nc = changeMap.get(ncId)
    if (!nc) return

    const { nodeType, ...props } = nodeChangeToProps(nc, blobs)
    if (props.sharedStyleType) props.internalOnly = true
    if (nodeType === 'DOCUMENT' || nodeType === 'VARIABLE' || nc.type === 'VARIABLE_SET') return
    if (shouldImportTextAsAutoSize(nc, changeMap.get(parentMap.get(ncId) ?? ''))) {
      props.textAutoResize = 'WIDTH_AND_HEIGHT'
    }

    const parentId = canvasIdToPageId.get(graphParentId) ?? graphParentId
    const node = graph.createNode(nodeType, parentId, props)
    if (node.motionTracks) {
      node.motionTracks.nodeId = node.id
    }
    guidToNodeId.set(ncId, node.id)

    for (const childId of getChildren(ncId)) {
      createSceneNode(childId, node.id)
    }
  }

  importPages(graph, changeMap, parentMap, childrenMap, created, canvasIdToPageId, createSceneNode)

  importCollections(changeMap, graph)
  importVariableEntries(changeMap, parentMap, graph, assetRefs)
  importVariableBindings(changeMap, guidToNodeId, graph)
  remapComponentIds(graph, guidToNodeId)
  remapPrototypeIds(graph, guidToNodeId)
  applyVariantPropSpecs(graph)

  const firstPageId = graph.getPages()[0]?.id
  const componentPageIds =
    options.populate === 'first-page' ? componentPageIdsForLazyPopulation(graph) : new Set<string>()
  const activeRootIds =
    options.populate === 'first-page'
      ? [firstPageId, ...componentPageIds].filter(isNotNil)
      : undefined

  if (options.populate !== 'none') {
    graph.preserveSourceMetadataDuring(() => {
      populateAndApplyOverrides(
        graph,
        changeMap as Map<string, InstanceNodeChange>,
        guidToNodeId,
        blobs,
        activeRootIds
      )
    })
  }

  if (activeRootIds)
    rememberLazyFigImportContext(graph, changeMap, guidToNodeId, blobs, activeRootIds)

  setVariableColorResolver(null)

  if (graph.getPages(true).length === 0) {
    graph.addPage('Page 1')
  }

  return graph
}
