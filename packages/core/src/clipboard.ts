import { inflateSync, deflateSync } from 'fflate'

import { populateAndApplyOverrides } from '@openweave/fig/instance-overrides'
import type { InstanceNodeChange } from '@openweave/fig/instance-overrides'
import {
  applyStyleRefsToFields,
  isComponentSet,
  nodeChangeToProps,
  setVariableColorResolver,
  shouldImportTextAsAutoSize,
  sortChildren
} from '@openweave/fig/node-change'
import { initCodec, getCompiledSchema, getSchemaBytes } from '@openweave/kiwi/fig/codec'
import type { GUID, NodeChange as KiwiNodeChange } from '@openweave/kiwi/fig/codec'
import { decodeBinarySchema, compileSchema, ByteBuffer } from '@openweave/kiwi/schema-runtime'
import type { SceneGraph, SceneNode } from '@openweave/scene-graph'

import { decodeBase64, decodeBase64Text, encodeBase64, encodeBase64Text } from './bytes'
import { shapeTextForClipboard } from './canvas/text/clipboard'
import { collectReferencedVariables } from './clipboard/openweave'
import {
  sceneNodeToKiwi,
  buildFigKiwi,
  parseFigKiwiChunks,
  decompressFigKiwiDataAsync,
  makeDocumentNodeChange,
  makeCanvasNodeChange,
  buildFontDigestMap
} from './kiwi/fig/node-change/serialize'
import {
  appendVariableNodeChanges,
  assignVariableGuids,
  buildAssetRefMap,
  buildVariableColorResolver,
  importCollections,
  importVariableBindings,
  importVariableEntries
} from './kiwi/fig/variables'
import { randomInt } from './random'
import { buildDerivedTextDataV4 } from './text/derived-text/clipboard'

interface FigmaClipboardMeta {
  fileKey: string
  pasteID: number
  dataType: string
}

export async function prefetchFigmaSchema(): Promise<void> {
  await initCodec()
}

/**
 * Maximum allowed size of the base64-encoded Figma clipboard binary.
 * ~67 MB base64 corresponds to ~50 MB of raw binary.  A normal single-frame
 * copy is well under 5 MB; slides with many components routinely exceed this.
 */
export const MAX_FIGMA_CLIPBOARD_B64_BYTES = 67_000_000

/**
 * Maximum allowed number of Kiwi node changes in a pasted Figma clipboard.
 * Exceeding this limit indicates a presentation-sized selection that would
 * exhaust the JS heap during clone/override resolution.
 */
export const MAX_FIGMA_CLIPBOARD_NODES = 30_000

// --- Paste from Figma ---

export async function parseFigmaClipboard(
  html: string
): Promise<{ nodes: KiwiNodeChange[]; meta: FigmaClipboardMeta; blobs: Uint8Array[] } | 'too-large' | null> {
  // Guard BEFORE regex: the Figma clipboard HTML is ~200 bytes of wrapper + the full base64
  // payload. Running match() on a multi-hundred-MB string is itself enough to OOM the
  // WebView renderer. Reject here before allocating any regex match objects.
  if (html.length > MAX_FIGMA_CLIPBOARD_B64_BYTES + 1000) {
    console.warn(
      `[clipboard] Figma paste rejected: HTML too large (${html.length} chars > ${MAX_FIGMA_CLIPBOARD_B64_BYTES} limit)`
    )
    return 'too-large'
  }

  const metaMatch = html.match(/\(figmeta\)(.*?)\(\/figmeta\)/)
  const bufMatch = html.match(/\(figma\)(.*?)\(\/figma\)/s)
  if (!metaMatch || !bufMatch) return null

  if (bufMatch[1].length > MAX_FIGMA_CLIPBOARD_B64_BYTES) {
    console.warn(
      `[clipboard] Figma paste rejected: payload too large ` +
        `(${bufMatch[1].length} chars > ${MAX_FIGMA_CLIPBOARD_B64_BYTES} limit)`
    )
    return 'too-large'
  }

  const meta: FigmaClipboardMeta = JSON.parse(decodeBase64Text(metaMatch[1]))
  const binary = decodeBase64(bufMatch[1])

  try {
    const chunks = parseFigKiwiChunks(binary)
    if (!chunks) return null

    const schemaBytes = inflateSync(chunks[0])
    const schema = decodeBinarySchema(new ByteBuffer(schemaBytes))
    const compiled = compileSchema(schema)
    const dataRaw = await decompressFigKiwiDataAsync(chunks[1])
    const msg = compiled.decodeMessage(dataRaw) as {
      nodeChanges?: KiwiNodeChange[]
      blobs?: Array<{ bytes: Uint8Array | Record<string, number> }>
    }

    const nodeChanges = msg.nodeChanges ?? []
    if (nodeChanges.length > MAX_FIGMA_CLIPBOARD_NODES) {
      console.warn(
        `[clipboard] Figma paste rejected: too many nodes ` +
          `(${nodeChanges.length} > ${MAX_FIGMA_CLIPBOARD_NODES} limit)`
      )
      return 'too-large'
    }

    const blobs: Uint8Array[] = (msg.blobs ?? []).map((b) =>
      b.bytes instanceof Uint8Array ? b.bytes : new Uint8Array(Object.values(b.bytes))
    )

    return { nodes: nodeChanges, meta, blobs }
  } catch {
    return null
  }
}


const NON_VISUAL_TYPES = new Set([
  'DOCUMENT',
  'CANVAS',
  'VARIABLE_SET',
  'VARIABLE',
  'VARIABLE_COLLECTION',
  'STYLE',
  'STYLE_SET',
  'INTERNAL_ONLY_NODE',
  'WIDGET',
  'STAMP',
  'STICKY',
  'SHAPE_WITH_TEXT',
  'CONNECTOR',
  'CODE_BLOCK',
  'TABLE_NODE',
  'TABLE_CELL',
  'SECTION_OVERLAY',
  'SLIDE'
])

function isChildOfVisualNode(nc: KiwiNodeChange, parentTypes: Map<string, string>): boolean {
  const parentId = nc.parentIndex?.guid
    ? `${nc.parentIndex.guid.sessionID}:${nc.parentIndex.guid.localID}`
    : null
  return (
    !!parentId &&
    parentTypes.has(parentId) &&
    !NON_VISUAL_TYPES.has(parentTypes.get(parentId) ?? '')
  )
}

export function figmaNodesBounds(
  nodeChanges: KiwiNodeChange[]
): { x: number; y: number; w: number; h: number } | null {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity

  const parentTypes = new Map<string, string>()
  for (const nc of nodeChanges) {
    if (!nc.guid) continue
    const id = `${nc.guid.sessionID}:${nc.guid.localID}`
    parentTypes.set(id, nc.type ?? '')
  }

  for (const nc of nodeChanges) {
    if (!nc.type || NON_VISUAL_TYPES.has(nc.type)) continue
    if (isChildOfVisualNode(nc, parentTypes)) continue

    const x = nc.transform?.m02 ?? 0
    const y = nc.transform?.m12 ?? 0
    const w = nc.size?.x ?? 0
    const h = nc.size?.y ?? 0
    minX = Math.min(minX, x)
    minY = Math.min(minY, y)
    maxX = Math.max(maxX, x + w)
    maxY = Math.max(maxY, y + h)
  }

  if (minX === Infinity) return null
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY }
}

interface ClipboardImportMaps {
  guidMap: Map<string, KiwiNodeChange>
  parentMap: Map<string, string>
}

function buildClipboardMaps(nodeChanges: KiwiNodeChange[]): ClipboardImportMaps {
  const guidMap = new Map<string, KiwiNodeChange>()
  const parentMap = new Map<string, string>()
  for (const nc of nodeChanges) {
    if (!nc.guid) continue
    const id = `${nc.guid.sessionID}:${nc.guid.localID}`
    guidMap.set(id, nc)
    if (nc.parentIndex?.guid) {
      parentMap.set(id, `${nc.parentIndex.guid.sessionID}:${nc.parentIndex.guid.localID}`)
    }
  }
  return { guidMap, parentMap }
}

function findInternalNodeIds(
  guidMap: Map<string, KiwiNodeChange>,
  parentMap: Map<string, string>
): { internalCanvasIds: Set<string>; internalFigmaIds: Set<string> } {
  const internalCanvasIds = new Set<string>()
  for (const [id, nc] of guidMap) {
    if (nc.type === 'CANVAS' && nc.internalOnly) {
      internalCanvasIds.add(id)
    }
  }

  const internalFigmaIds = new Set<string>()
  function markInternal(id: string) {
    internalFigmaIds.add(id)
    for (const [childId, pid] of parentMap) {
      if (pid === id && !internalFigmaIds.has(childId)) markInternal(childId)
    }
  }
  for (const canvasId of internalCanvasIds) markInternal(canvasId)

  return { internalCanvasIds, internalFigmaIds }
}

function classifyTopLevelNodes(
  guidMap: Map<string, KiwiNodeChange>,
  parentMap: Map<string, string>,
  internalCanvasIds: Set<string>
): { topLevel: string[]; internalTopLevel: string[] } {
  const topLevel: string[] = []
  const internalTopLevel: string[] = []
  for (const [id, nc] of guidMap) {
    if (NON_VISUAL_TYPES.has(nc.type ?? '')) continue
    const parentId = parentMap.get(id)
    if (
      !parentId ||
      !guidMap.has(parentId) ||
      NON_VISUAL_TYPES.has(guidMap.get(parentId)?.type ?? '')
    ) {
      if (parentId && internalCanvasIds.has(parentId)) {
        internalTopLevel.push(id)
      } else {
        topLevel.push(id)
      }
    }
  }
  return { topLevel, internalTopLevel }
}

function remapComponentIds(created: Map<string, string>, graph: SceneGraph): void {
  for (const [, ourId] of created) {
    const node = graph.getNode(ourId)
    if (node?.type !== 'INSTANCE' || !node.componentId) continue
    const ourComponentId = created.get(node.componentId)
    if (ourComponentId) graph.updateNode(ourId, { componentId: ourComponentId })
  }
}

function detachOrphanedInstances(created: Map<string, string>, graph: SceneGraph): void {
  for (const [, ourId] of created) {
    const node = graph.getNode(ourId)
    if (node?.type !== 'INSTANCE') continue
    if (node.childIds.length === 0 && (!node.componentId || !graph.getNode(node.componentId))) {
      graph.updateNode(ourId, { type: 'FRAME', componentId: '' })
    }
  }
}

function isFigmaComponentSet(
  nc: KiwiNodeChange,
  figmaId: string,
  parentMap: Map<string, string>,
  guidMap: Map<string, KiwiNodeChange>
): boolean {
  if (nc.type !== 'FRAME' && nc.type !== 'COMPONENT_SET') return false
  if (isComponentSet(nc)) return true
  for (const [childId, pid] of parentMap) {
    if (pid === figmaId) {
      const childType = guidMap.get(childId)?.type
      if (childType === 'SYMBOL' || childType === 'COMPONENT') {
        return true
      }
    }
  }
  return false
}

function getOrCreateInternalPage(graph: SceneGraph): string {
  const existing = graph.getPages(true).find((p) => p.internalOnly)
  if (existing) return existing.id
  const page = graph.createNode('CANVAS', graph.rootId, {
    name: 'Internal Only Canvas',
    internalOnly: true,
    width: 0,
    height: 0
  })
  return page.id
}

export function importClipboardNodes(
  nodeChanges: KiwiNodeChange[],
  graph: SceneGraph,
  targetParentId: string,
  offsetX = 0,
  offsetY = 0,
  blobs: Uint8Array[] = []
): string[] {
  const { guidMap, parentMap } = buildClipboardMaps(nodeChanges)
  for (const nc of guidMap.values()) {
    applyStyleRefsToFields(guidMap, nc)
  }
  const assetRefs = buildAssetRefMap(guidMap)
  setVariableColorResolver(buildVariableColorResolver(guidMap, assetRefs))

  try {
    importCollections(guidMap, graph)
    importVariableEntries(guidMap, parentMap, graph, assetRefs)

    const { internalCanvasIds, internalFigmaIds } = findInternalNodeIds(guidMap, parentMap)
    const { topLevel, internalTopLevel } = classifyTopLevelNodes(
      guidMap,
      parentMap,
      internalCanvasIds
    )

    const created = new Map<string, string>()
    const createdIds: string[] = []

    const effectiveTopLevel = topLevel.length > 0 ? topLevel : [...internalTopLevel]
    const effectiveInternalTopLevel = topLevel.length > 0 ? internalTopLevel : []

    function createNode(figmaId: string, ourParentId: string) {
      if (created.has(figmaId)) return
      const nc = guidMap.get(figmaId)
      if (!nc) return

      const { nodeType: rawNodeType, ...props } = nodeChangeToProps(nc, blobs)
      let nodeType = rawNodeType
      if (nodeType === 'DOCUMENT' || nodeType === 'VARIABLE' || nc.type === 'VARIABLE_SET') return

      if (nodeType === 'FRAME' && isFigmaComponentSet(nc, figmaId, parentMap, guidMap)) {
        nodeType = 'COMPONENT_SET'
      }

      if (shouldImportTextAsAutoSize(nc, guidMap.get(parentMap.get(figmaId) ?? ''))) {
        props.textAutoResize = 'WIDTH_AND_HEIGHT'
      }

      if (ourParentId === targetParentId) {
        props.x = (props.x ?? 0) + offsetX
        props.y = (props.y ?? 0) + offsetY
      }

      const node = graph.createNode(nodeType, ourParentId, props)

      created.set(figmaId, node.id)
      if (ourParentId === targetParentId && !internalFigmaIds.has(figmaId)) {
        createdIds.push(node.id)
      }

      const children: string[] = []
      for (const [childId, pid] of parentMap) {
        if (pid === figmaId && !NON_VISUAL_TYPES.has(guidMap.get(childId)?.type ?? '')) {
          children.push(childId)
        }
      }
      sortChildren(children, nc, guidMap)
      for (const childId of children) {
        createNode(childId, node.id)
      }
    }

    // 1. Promote top-level instances referencing standalone internal symbols to COMPONENT
    for (const id of effectiveTopLevel) {
      const nc = guidMap.get(id)
      if (nc?.type !== 'INSTANCE') continue

      const symGuid = nc.symbolData?.symbolID
      const symFigmaId = symGuid ? `${symGuid.sessionID}:${symGuid.localID}` : null
      if (!symFigmaId || !guidMap.has(symFigmaId)) continue

      const symNc = guidMap.get(symFigmaId)
      if (!symNc || symNc.type !== 'SYMBOL') continue

      const symParentId = parentMap.get(symFigmaId)
      const symParentNc = symParentId ? guidMap.get(symParentId) : null
      const isInsideComponentSet =
        symParentId && symParentNc
          ? isFigmaComponentSet(symParentNc, symParentId, parentMap, guidMap)
          : false

      const instanceNc = nc as InstanceNodeChange
      const hasOverrides = (instanceNc.symbolData?.symbolOverrides?.length ?? 0) > 0

      if (
        !isInsideComponentSet &&
        internalFigmaIds.has(symFigmaId) &&
        !hasOverrides &&
        !created.has(symFigmaId)
      ) {
        const { nodeType: _t, ...symProps } = nodeChangeToProps(symNc, blobs)
        const instanceProps = nodeChangeToProps(nc, blobs)

        symProps.x = (instanceProps.x ?? 0) + offsetX
        symProps.y = (instanceProps.y ?? 0) + offsetY
        if (
          instanceProps.width !== undefined &&
          Number.isFinite(instanceProps.width) &&
          instanceProps.width > 0
        ) {
          symProps.width = instanceProps.width
        }
        if (
          instanceProps.height !== undefined &&
          Number.isFinite(instanceProps.height) &&
          instanceProps.height > 0
        ) {
          symProps.height = instanceProps.height
        }
        if (instanceProps.rotation !== undefined) symProps.rotation = instanceProps.rotation
        symProps.name = nc.name ?? symNc.name ?? 'Component'

        if (shouldImportTextAsAutoSize(symNc, guidMap.get(parentMap.get(symFigmaId) ?? ''))) {
          symProps.textAutoResize = 'WIDTH_AND_HEIGHT'
        }

        if (!symProps.figmaDerivedLayout && symProps.width && symProps.height) {
          symProps.figmaDerivedLayout = {
            x: symProps.x,
            y: symProps.y,
            width: symProps.width,
            height: symProps.height
          }
        }

        const compNode = graph.createNode('COMPONENT', targetParentId, {
          ...symProps,
          componentId: ''
        })
        created.set(symFigmaId, compNode.id)
        created.set(id, compNode.id)
        createdIds.push(compNode.id)

        const children: string[] = []
        for (const [childId, pid] of parentMap) {
          if (pid === symFigmaId && !NON_VISUAL_TYPES.has(guidMap.get(childId)?.type ?? '')) {
            children.push(childId)
          }
        }
        sortChildren(children, symNc, guidMap)
        for (const childId of children) {
          createNode(childId, compNode.id)
        }
      }
    }

    // 2. Create remaining internal nodes on an internalOnly page (NOT deleted!)
    let internalPageId: string | null = null
    for (const id of effectiveInternalTopLevel) {
      if (created.has(id)) continue
      if (!internalPageId) {
        internalPageId = getOrCreateInternalPage(graph)
      }
      createNode(id, internalPageId)
    }

    // 3. Create top-level nodes on targetParentId
    for (const id of effectiveTopLevel) {
      createNode(id, targetParentId)
    }

    remapComponentIds(created, graph)
    importVariableBindings(guidMap, created, graph)

    const pasteRootIds = [...createdIds, ...(internalPageId ? [internalPageId] : [])]
    populateAndApplyOverrides(
      graph,
      guidMap as Map<string, InstanceNodeChange>,
      created,
      blobs,
      pasteRootIds
    )

    detachOrphanedInstances(created, graph)

    return createdIds
  } finally {
    setVariableColorResolver(null)
  }
}

export async function buildFigmaClipboardHTML(
  nodes: SceneNode[],
  graph: SceneGraph
): Promise<string | null> {
  const compiled = getCompiledSchema()
  const schemaDeflated = deflateSync(getSchemaBytes())

  const exportedNodeIds = new Set(nodes.map((n) => n.id))
  const referencedComponentIds = new Set<string>()
  const visitedForComponents = new Set<string>()

  const findReferencedComponents = (node: SceneNode) => {
    if (visitedForComponents.has(node.id)) return
    visitedForComponents.add(node.id)

    if (node.type === 'INSTANCE' && node.componentId && !exportedNodeIds.has(node.componentId)) {
      if (!referencedComponentIds.has(node.componentId)) {
        referencedComponentIds.add(node.componentId)
        const comp = graph.getNode(node.componentId)
        if (comp) findReferencedComponents(comp)
      }
    }
    for (const childId of node.childIds) {
      const child = graph.getNode(childId)
      if (child) findReferencedComponents(child)
    }
  }
  for (const node of nodes) findReferencedComponents(node)

  const referencedComponents: SceneNode[] = []
  for (const compId of referencedComponentIds) {
    const comp = graph.getNode(compId)
    if (comp) referencedComponents.push(comp)
  }

  const exportedTextNodes: SceneNode[] = []
  const visitedTextNodes = new Set<string>()
  const collectTextNodes = (node: SceneNode) => {
    if (visitedTextNodes.has(node.id)) return
    visitedTextNodes.add(node.id)
    if (node.type === 'TEXT') exportedTextNodes.push(node)
    if (node.type === 'INSTANCE') return
    for (const childId of node.childIds) {
      const child = graph.getNode(childId)
      if (child) collectTextNodes(child)
    }
  }
  for (const node of nodes) collectTextNodes(node)
  for (const comp of referencedComponents) collectTextNodes(comp)

  const fontDigestMap = await buildFontDigestMap(graph, exportedTextNodes)

  const allExportedNodes = [...nodes, ...referencedComponents]
  const { variableCollections } = collectReferencedVariables(allExportedNodes, graph)

  const docGuid = { sessionID: 0, localID: 0 }
  const canvasGuid = { sessionID: 0, localID: 1 }
  const localIdCounter = { value: 100 }

  const nodeChanges: KiwiNodeChange[] = [
    makeDocumentNodeChange(docGuid, graph.documentColorSpace),
    makeCanvasNodeChange(canvasGuid, docGuid, '!', 'Page 1')
  ]

  const varIdToGuid = new Map<string, GUID>()
  const modeIdToGuid = new Map<string, GUID>()
  const assignedGuidValues = new Set<string>()
  const nodeSourceGuidValues = new Set<string>()
  const nodeIdToGuid = new Map<string, GUID>()

  if (variableCollections.length > 0) {
    assignVariableGuids(
      graph,
      localIdCounter,
      varIdToGuid,
      modeIdToGuid,
      assignedGuidValues,
      nodeSourceGuidValues,
      variableCollections
    )
    appendVariableNodeChanges(
      graph,
      nodeChanges,
      canvasGuid,
      varIdToGuid,
      modeIdToGuid,
      variableCollections
    )
  }

  const blobs: Uint8Array[] = []
  for (let i = 0; i < nodes.length; i++) {
    nodeChanges.push(
      ...sceneNodeToKiwi(
        nodes[i],
        canvasGuid,
        i,
        localIdCounter,
        graph,
        blobs,
        nodeIdToGuid,
        fontDigestMap,
        varIdToGuid,
        undefined,
        undefined,
        assignedGuidValues,
        undefined,
        modeIdToGuid
      )
    )
  }

  if (referencedComponents.length > 0) {
    const internalCanvasGuid = { sessionID: 0, localID: 2 }
    const internalCanvasNc = makeCanvasNodeChange(internalCanvasGuid, docGuid, '"', 'Internal')
    internalCanvasNc.internalOnly = true
    internalCanvasNc.pageType = 'DESIGN'
    nodeChanges.push(internalCanvasNc)

    let compIdx = 0
    for (const comp of referencedComponents) {
      nodeChanges.push(
        ...sceneNodeToKiwi(
          comp,
          internalCanvasGuid,
          compIdx++,
          localIdCounter,
          graph,
          blobs,
          nodeIdToGuid,
          fontDigestMap,
          varIdToGuid,
          undefined,
          undefined,
          assignedGuidValues,
          undefined,
          modeIdToGuid
        )
      )
    }
  }

  const textNodeQueue = [...exportedTextNodes]
  for (const change of nodeChanges) {
    if (change.type !== 'TEXT') continue
    const source = textNodeQueue.shift()
    if (!source) continue
    change.textAutoResize = 'NONE'
    change.textUserLayoutVersion = 5
    change.lineHeight = {
      value: source.lineHeight ?? 100,
      units: source.lineHeight ? 'PIXELS' : 'PERCENT'
    }
    const shaped =
      exportedTextNodes.length <= 10 ? await shapeTextForClipboard(source).catch(() => null) : null
    change.derivedTextData = await buildDerivedTextDataV4(source, fontDigestMap, shaped, blobs)
  }

  const msg: Record<string, unknown> = {
    type: 'NODE_CHANGES',
    sessionID: 0,
    ackID: 0,
    pasteID: randomInt(),
    pasteFileKey: 'openweave',
    nodeChanges
  }

  if (blobs.length > 0) {
    msg.blobs = blobs.map((bytes) => ({ bytes }))
  }

  const dataRaw = compiled.encodeMessage(msg)
  const figKiwiBinary = buildFigKiwi(schemaDeflated, dataRaw)
  const bufferB64 = encodeBase64(figKiwiBinary)

  const meta: FigmaClipboardMeta = {
    fileKey: 'openweave',
    pasteID: msg.pasteID as number,
    dataType: 'scene'
  }
  const metaB64 = encodeBase64Text(JSON.stringify(meta))

  return (
    `<meta charset='utf-8'>` +
    `<span data-metadata="<!--(figmeta)${metaB64}(/figmeta)-->"></span>` +
    `<span data-buffer="<!--(figma)${bufferB64}(/figma)-->"></span>`
  )
}

export {
  buildOpenWeaveClipboardHTML,
  collectReferencedVariables,
  parseOpenWeaveClipboard,
  type OpenWeaveClipboardData,
  type TextPictureBuilder
} from './clipboard/openweave'
