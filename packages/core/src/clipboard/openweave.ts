import { deflateSync, inflateSync } from 'fflate'

import type { SceneGraph, SceneNode, Variable, VariableCollection } from '@openweave/scene-graph'
import type { JsonObject } from '@openweave/scene-graph/primitives'

import { decodeBase64, encodeBase64 } from '#core/bytes'

// --- Internal copy/paste (OpenWeave ↔ OpenWeave) ---

export interface OpenWeaveClipboardData {
  nodes: Array<SceneNode & { children?: SceneNode[] }>
  images: Map<string, Uint8Array>
  variables?: Variable[]
  variableCollections?: VariableCollection[]
}

export function parseOpenWeaveClipboard(html: string): OpenWeaveClipboardData | null {
  const match = html.match(/<!--\(openweave\)(.*?)\(\/openweave\)-->/s)
  if (!match) return null

  try {
    const raw = decodeBase64(match[1])
    let bytes: Uint8Array
    try {
      bytes = inflateSync(raw)
    } catch {
      bytes = raw
    }
    const decoded = JSON.parse(new TextDecoder().decode(bytes))
    if (decoded.format === 'openweave/v1' && Array.isArray(decoded.nodes)) {
      restoreTextPictures(decoded.nodes)
      const images = new Map<string, Uint8Array>()
      if (decoded.images && typeof decoded.images === 'object') {
        for (const [hash, b64] of Object.entries(decoded.images)) {
          if (typeof b64 === 'string') {
            images.set(hash, decodeBase64(b64))
          }
        }
      }
      return {
        nodes: decoded.nodes,
        images,
        variables: Array.isArray(decoded.variables) ? decoded.variables : undefined,
        variableCollections: Array.isArray(decoded.variableCollections)
          ? decoded.variableCollections
          : undefined
      }
    }
  } catch (e) {
    console.warn('Failed to parse OpenWeave clipboard data:', e)
  }
  return null
}

function restoreTextPictures(nodes: JsonObject[]): void {
  for (const node of nodes) {
    if (typeof node.textPicture === 'string') {
      node.textPicture = decodeBase64(node.textPicture)
    }
    if (Array.isArray(node.children)) {
      restoreTextPictures(node.children)
    }
  }
}

export type TextPictureBuilder = (node: SceneNode) => Uint8Array | null

function walkSubtrees(
  nodes: SceneNode[],
  graph: SceneGraph,
  visitor: (node: SceneNode) => void,
  maxDepth = 20
): void {
  const visited = new Set<string>()
  function walk(nodeList: SceneNode[], depth: number) {
    if (depth > maxDepth) return
    for (const node of nodeList) {
      if (visited.has(node.id)) continue
      visited.add(node.id)
      visitor(node)
      walk(graph.getChildren(node.id), depth + 1)
    }
  }
  walk(nodes, 0)
}

function collectImageHashes(nodes: SceneNode[], graph: SceneGraph): Set<string> {
  const hashes = new Set<string>()
  walkSubtrees(nodes, graph, (node) => {
    for (const fill of node.fills) {
      if (fill.imageHash) hashes.add(fill.imageHash)
    }
  })
  return hashes
}

export function collectReferencedVariables(
  nodes: SceneNode[],
  graph: SceneGraph
): { variables: Variable[]; variableCollections: VariableCollection[] } {
  const varIds = new Set<string>()
  walkSubtrees(nodes, graph, (node) => {
    for (const varId of Object.values(node.boundVariables)) {
      if (typeof varId === 'string') varIds.add(varId)
    }
  })

  const collectedVars = new Map<string, Variable>()
  const collectionIds = new Set<string>()

  function collectVar(varId: string, depth = 0) {
    if (depth > 10 || collectedVars.has(varId)) return
    const v = graph.variables.get(varId)
    if (!v) return
    collectedVars.set(varId, structuredClone(v))
    collectionIds.add(v.collectionId)

    for (const val of Object.values(v.valuesByMode)) {
      if (val && typeof val === 'object' && 'aliasId' in val && typeof val.aliasId === 'string') {
        collectVar(val.aliasId, depth + 1)
      }
    }
  }

  for (const id of varIds) collectVar(id)

  const collections: VariableCollection[] = []
  for (const cid of collectionIds) {
    const col = graph.variableCollections.get(cid)
    if (col) {
      const cloned = structuredClone(col)
      cloned.variableIds = cloned.variableIds.filter((vid) => collectedVars.has(vid))
      collections.push(cloned)
    }
  }

  return {
    variables: Array.from(collectedVars.values()),
    variableCollections: collections
  }
}

export function buildOpenWeaveClipboardHTML(
  nodes: SceneNode[],
  graph: SceneGraph,
  textPictureBuilder?: TextPictureBuilder
): string {
  const nodeTree = collectNodeTree(nodes, graph, textPictureBuilder)
  const hashes = collectImageHashes(nodes, graph)
  const images: Record<string, string> = {}
  for (const hash of hashes) {
    const bytes = graph.images.get(hash)
    if (bytes) images[hash] = encodeBase64(bytes)
  }
  const { variables, variableCollections } = collectReferencedVariables(nodes, graph)
  const data: Record<string, unknown> = {
    format: 'openweave/v1',
    nodes: nodeTree,
    images
  }
  if (variables.length > 0) data.variables = variables
  if (variableCollections.length > 0) data.variableCollections = variableCollections

  const compressed = deflateSync(new TextEncoder().encode(JSON.stringify(data)))
  return `<!--(openweave)${encodeBase64(compressed)}(/openweave)-->`
}

function collectNodeTree(
  nodes: SceneNode[],
  graph: SceneGraph,
  textPictureBuilder?: TextPictureBuilder,
  depth = 0,
  visited = new Set<string>()
): JsonObject[] {
  if (depth > 20) return []
  const result: JsonObject[] = []
  for (const node of nodes) {
    if (visited.has(node.id)) continue
    visited.add(node.id)

    const children = graph.getChildren(node.id)
    const serialized: Record<string, unknown> = { ...node }

    if (node.type === 'TEXT' && node.text && textPictureBuilder) {
      const pic = node.textPicture ?? textPictureBuilder(node)
      if (pic) serialized.textPicture = encodeBase64(pic)
    } else {
      delete serialized.textPicture
    }

    if (children.length > 0) {
      serialized.children = collectNodeTree(children, graph, textPictureBuilder, depth + 1, visited)
    }
    result.push(serialized)
  }
  return result
}
