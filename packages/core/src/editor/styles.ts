import type {
  Effect,
  Fill,
  LayoutGrid,
  SceneNode,
  SharedStyle,
  SharedStyleKind,
  SharedStyleType
} from '@openweave/scene-graph'
import {
  copyEffects,
  copyFills,
  getSharedStyles as getSharedStylesFromGraph,
  sharedStyleRefKey,
  sharedStyleTypeForKind
} from '@openweave/scene-graph'

import type { EditorContext } from './types'

export interface SharedStyleTypographyPatch {
  fontFamily?: string
  fontWeight?: number
  italic?: boolean
  fontSize?: number
  lineHeight?: number | null
  letterSpacing?: number
  textDecoration?: SceneNode['textDecoration']
  textCase?: SceneNode['textCase']
}

export interface SharedStyleUpdatePatch {
  name?: string
  description?: string
  fills?: Fill[]
  effects?: Effect[]
  layoutGrids?: LayoutGrid[]
  typography?: SharedStyleTypographyPatch
}

export function createStyleActions(ctx: EditorContext) {
  function findStyleNode(styleId: string): SceneNode | null {
    for (const node of ctx.graph.getAllNodes()) {
      if (node.sharedStyleType && node.source.id === styleId) {
        return node
      }
    }
    return null
  }

  function getSharedStyles(kind?: SharedStyleKind): SharedStyle[] {
    if (kind) {
      return getSharedStylesFromGraph(ctx.graph, kind)
    }
    const all: SharedStyle[] = []
    const kinds: SharedStyleKind[] = ['fill', 'text', 'effect', 'grid']
    for (const k of kinds) {
      all.push(...getSharedStylesFromGraph(ctx.graph, k))
    }
    return all
  }

  function createSharedStyle(
    kind: SharedStyleKind,
    name: string,
    sourceNode?: SceneNode | null
  ): string {
    const randomSuffix = crypto.getRandomValues(new Uint32Array(1))[0].toString(36)
    const styleId = `style_${randomSuffix}`
    const type: SharedStyleType = sharedStyleTypeForKind(kind)
    const refKey = sharedStyleRefKey(kind)
    const targetPageId = ctx.state.currentPageId

    let nodeType: SceneNode['type'] = 'RECTANGLE'
    const payload: Partial<SceneNode> = {}

    if (kind === 'fill') {
      nodeType = 'RECTANGLE'
      if (sourceNode?.fills) {
        payload.fills = copyFills(sourceNode.fills)
      }
    } else if (kind === 'stroke') {
      nodeType = 'RECTANGLE'
      if (sourceNode?.strokes) {
        payload.fills = sourceNode.strokes.map((s) => ({
          type: 'SOLID' as const,
          color: { ...s.color },
          opacity: s.opacity,
          visible: s.visible
        }))
      }
    } else if (kind === 'text') {
      nodeType = 'TEXT'
      if (sourceNode) {
        payload.fontFamily = sourceNode.fontFamily
        payload.fontWeight = sourceNode.fontWeight
        payload.italic = sourceNode.italic
        payload.fontSize = sourceNode.fontSize
        payload.lineHeight = sourceNode.lineHeight
        payload.letterSpacing = sourceNode.letterSpacing
        payload.textDecoration = sourceNode.textDecoration
        payload.textCase = sourceNode.textCase
      }
    } else if (kind === 'effect') {
      nodeType = 'RECTANGLE'
      if (sourceNode?.effects) {
        payload.effects = copyEffects(sourceNode.effects)
      }
    } else if (kind === 'grid') {
      nodeType = 'FRAME'
      if (sourceNode?.layoutGrids) {
        payload.layoutGrids = structuredClone(sourceNode.layoutGrids)
      }
    }

    const styleNode = ctx.graph.createNode(nodeType, targetPageId, {
      name: name.trim() || `Untitled ${kind} style`,
      sharedStyleType: type,
      internalOnly: true,
      ...payload
    })
    styleNode.source.id = styleId
    styleNode.source.format = 'fig'

    const sourceId = sourceNode?.id
    const prevRef = sourceNode ? Reflect.get(sourceNode, refKey) : null

    if (sourceId) {
      ctx.graph.updateNode(sourceId, { [refKey]: styleId } as Partial<SceneNode>)
    }

    const snapshot = { ...styleNode }
    const createdId = styleNode.id

    ctx.undo.push({
      label: `Create ${kind} style`,
      forward: () => {
        ctx.graph.createNode(snapshot.type, targetPageId, snapshot)
        if (sourceId) {
          ctx.graph.updateNode(sourceId, { [refKey]: styleId } as Partial<SceneNode>)
        }
        ctx.requestRender()
      },
      inverse: () => {
        ctx.graph.deleteNode(createdId)
        if (sourceId) {
          ctx.graph.updateNode(sourceId, { [refKey]: prevRef } as Partial<SceneNode>)
        }
        ctx.requestRender()
      }
    })

    ctx.requestRender()
    return styleId
  }

  function updateSharedStyle(styleId: string, patch: SharedStyleUpdatePatch): boolean {
    const styleNode = findStyleNode(styleId)
    if (!styleNode) return false

    const styleType = styleNode.sharedStyleType
    const nodePatch: Partial<SceneNode> = {}

    if (patch.name !== undefined) nodePatch.name = patch.name.trim()
    if (patch.fills !== undefined) nodePatch.fills = copyFills(patch.fills)
    if (patch.effects !== undefined) nodePatch.effects = copyEffects(patch.effects)
    if (patch.layoutGrids !== undefined) nodePatch.layoutGrids = structuredClone(patch.layoutGrids)
    if (patch.typography) {
      if (patch.typography.fontFamily !== undefined)
        nodePatch.fontFamily = patch.typography.fontFamily
      if (patch.typography.fontWeight !== undefined)
        nodePatch.fontWeight = patch.typography.fontWeight
      if (patch.typography.italic !== undefined) nodePatch.italic = patch.typography.italic
      if (patch.typography.fontSize !== undefined) nodePatch.fontSize = patch.typography.fontSize
      if (patch.typography.lineHeight !== undefined)
        nodePatch.lineHeight = patch.typography.lineHeight
      if (patch.typography.letterSpacing !== undefined)
        nodePatch.letterSpacing = patch.typography.letterSpacing
      if (patch.typography.textDecoration !== undefined)
        nodePatch.textDecoration = patch.typography.textDecoration
      if (patch.typography.textCase !== undefined) nodePatch.textCase = patch.typography.textCase
    }

    // Collect bound nodes and their previous states for undo
    const affected: Array<{ id: string; prev: Partial<SceneNode>; next: Partial<SceneNode> }> = []

    for (const node of ctx.graph.getAllNodes()) {
      if (node.internalOnly) continue

      if (styleType === 'FILL' && node.fillStyleId === styleId && patch.fills) {
        affected.push({
          id: node.id,
          prev: { fills: copyFills(node.fills) },
          next: { fills: copyFills(patch.fills) }
        })
      } else if (styleType === 'EFFECT' && node.effectStyleId === styleId && patch.effects) {
        affected.push({
          id: node.id,
          prev: { effects: copyEffects(node.effects) },
          next: { effects: copyEffects(patch.effects) }
        })
      } else if (styleType === 'GRID' && node.gridStyleId === styleId && patch.layoutGrids) {
        affected.push({
          id: node.id,
          prev: { layoutGrids: structuredClone(node.layoutGrids) },
          next: { layoutGrids: structuredClone(patch.layoutGrids) }
        })
      } else if (styleType === 'TEXT' && node.textStyleId === styleId && patch.typography) {
        const prevText: Partial<SceneNode> = {
          fontFamily: node.fontFamily,
          fontWeight: node.fontWeight,
          italic: node.italic,
          fontSize: node.fontSize,
          lineHeight: node.lineHeight,
          letterSpacing: node.letterSpacing,
          textDecoration: node.textDecoration,
          textCase: node.textCase
        }
        const nextText: Partial<SceneNode> = {}
        if (patch.typography.fontFamily !== undefined)
          nextText.fontFamily = patch.typography.fontFamily
        if (patch.typography.fontWeight !== undefined)
          nextText.fontWeight = patch.typography.fontWeight
        if (patch.typography.italic !== undefined) nextText.italic = patch.typography.italic
        if (patch.typography.fontSize !== undefined) nextText.fontSize = patch.typography.fontSize
        if (patch.typography.lineHeight !== undefined)
          nextText.lineHeight = patch.typography.lineHeight
        if (patch.typography.letterSpacing !== undefined)
          nextText.letterSpacing = patch.typography.letterSpacing
        if (patch.typography.textDecoration !== undefined)
          nextText.textDecoration = patch.typography.textDecoration
        if (patch.typography.textCase !== undefined) nextText.textCase = patch.typography.textCase
        affected.push({ id: node.id, prev: prevText, next: nextText })
      }
    }

    const prevStyleProps: Partial<SceneNode> = {}
    for (const key of Object.keys(nodePatch) as (keyof SceneNode)[]) {
      Reflect.set(prevStyleProps, key, Reflect.get(styleNode, key))
    }

    // Apply forward
    ctx.graph.updateNode(styleNode.id, nodePatch)
    for (const a of affected) {
      ctx.graph.updateNode(a.id, a.next)
    }

    ctx.undo.push({
      label: 'Update shared style',
      forward: () => {
        ctx.graph.updateNode(styleNode.id, nodePatch)
        for (const a of affected) ctx.graph.updateNode(a.id, a.next)
        ctx.requestRender()
      },
      inverse: () => {
        ctx.graph.updateNode(styleNode.id, prevStyleProps)
        for (const a of affected) ctx.graph.updateNode(a.id, a.prev)
        ctx.requestRender()
      }
    })

    ctx.requestRender()
    return true
  }

  function deleteSharedStyle(styleId: string): boolean {
    const styleNode = findStyleNode(styleId)
    if (!styleNode) return false

    const styleType = styleNode.sharedStyleType
    const bound: Array<{ id: string; key: keyof SceneNode; prevVal: string | null }> = []

    for (const node of ctx.graph.getAllNodes()) {
      if (node.internalOnly) continue
      if (styleType === 'FILL' && node.fillStyleId === styleId) {
        bound.push({ id: node.id, key: 'fillStyleId', prevVal: styleId })
      } else if (styleType === 'FILL' && node.strokeStyleId === styleId) {
        bound.push({ id: node.id, key: 'strokeStyleId', prevVal: styleId })
      } else if (styleType === 'EFFECT' && node.effectStyleId === styleId) {
        bound.push({ id: node.id, key: 'effectStyleId', prevVal: styleId })
      } else if (styleType === 'GRID' && node.gridStyleId === styleId) {
        bound.push({ id: node.id, key: 'gridStyleId', prevVal: styleId })
      } else if (styleType === 'TEXT' && node.textStyleId === styleId) {
        bound.push({ id: node.id, key: 'textStyleId', prevVal: styleId })
      }
    }

    for (const b of bound) {
      ctx.graph.updateNode(b.id, { [b.key]: null } as Partial<SceneNode>)
    }
    const snapshot = { ...styleNode }
    const styleNodeId = styleNode.id
    const parentId = styleNode.parentId ?? ctx.state.currentPageId
    ctx.graph.deleteNode(styleNodeId)

    ctx.undo.push({
      label: 'Delete shared style',
      forward: () => {
        for (const b of bound) ctx.graph.updateNode(b.id, { [b.key]: null } as Partial<SceneNode>)
        ctx.graph.deleteNode(styleNodeId)
        ctx.requestRender()
      },
      inverse: () => {
        ctx.graph.createNode(snapshot.type, parentId, snapshot)
        for (const b of bound)
          ctx.graph.updateNode(b.id, { [b.key]: b.prevVal } as Partial<SceneNode>)
        ctx.requestRender()
      }
    })

    ctx.requestRender()
    return true
  }

  return {
    createSharedStyle,
    updateSharedStyle,
    deleteSharedStyle,
    getSharedStyles,
    findStyleNode
  }
}
