import type { SceneNode } from '@openweave/scene-graph'
import { copyEffects, copyFills, copyStrokes } from '@openweave/scene-graph/copy'

import type { EditorContext } from '#core/editor/types'

export interface CopiedProperties {
  fills?: SceneNode['fills']
  strokes?: SceneNode['strokes']
  borderTopWeight?: SceneNode['borderTopWeight']
  borderRightWeight?: SceneNode['borderRightWeight']
  borderBottomWeight?: SceneNode['borderBottomWeight']
  borderLeftWeight?: SceneNode['borderLeftWeight']
  independentStrokeWeights?: SceneNode['independentStrokeWeights']
  strokeCap?: SceneNode['strokeCap']
  strokeJoin?: SceneNode['strokeJoin']
  strokeMiterLimit?: SceneNode['strokeMiterLimit']
  dashPattern?: SceneNode['dashPattern']
  effects?: SceneNode['effects']
  opacity?: SceneNode['opacity']
  blendMode?: SceneNode['blendMode']
  cornerRadius?: SceneNode['cornerRadius']
  topLeftRadius?: SceneNode['topLeftRadius']
  topRightRadius?: SceneNode['topRightRadius']
  bottomRightRadius?: SceneNode['bottomRightRadius']
  bottomLeftRadius?: SceneNode['bottomLeftRadius']
  cornerSmoothing?: SceneNode['cornerSmoothing']
  isText?: boolean
  fontFamily?: SceneNode['fontFamily']
  fontWeight?: SceneNode['fontWeight']
  fontSize?: SceneNode['fontSize']
  italic?: SceneNode['italic']
  lineHeight?: SceneNode['lineHeight']
  letterSpacing?: SceneNode['letterSpacing']
  textAlignHorizontal?: SceneNode['textAlignHorizontal']
  textAlignVertical?: SceneNode['textAlignVertical']
  textCase?: SceneNode['textCase']
  textDecoration?: SceneNode['textDecoration']
  textAutoResize?: SceneNode['textAutoResize']
}

export function createClipboardPropertiesActions(
  ctx: EditorContext,
  updateNodeWithUndo: (id: string, changes: Partial<SceneNode>, label?: string) => void
) {
  function copyProperties(nodeId?: string): CopiedProperties | null {
    const id = nodeId ?? [...ctx.state.selectedIds][0]
    if (!id) return null
    const node = ctx.graph.getNode(id)
    if (!node) return null

    const copied: CopiedProperties = {
      fills: node.fills ? copyFills(node.fills) : undefined,
      strokes: node.strokes ? copyStrokes(node.strokes) : undefined,
      borderTopWeight: node.borderTopWeight,
      borderRightWeight: node.borderRightWeight,
      borderBottomWeight: node.borderBottomWeight,
      borderLeftWeight: node.borderLeftWeight,
      independentStrokeWeights: node.independentStrokeWeights,
      strokeCap: node.strokeCap,
      strokeJoin: node.strokeJoin,
      strokeMiterLimit: node.strokeMiterLimit,
      dashPattern: node.dashPattern ? [...node.dashPattern] : undefined,
      effects: node.effects ? copyEffects(node.effects) : undefined,
      opacity: node.opacity,
      blendMode: node.blendMode,
      cornerRadius: node.cornerRadius,
      topLeftRadius: node.topLeftRadius,
      topRightRadius: node.topRightRadius,
      bottomRightRadius: node.bottomRightRadius,
      bottomLeftRadius: node.bottomLeftRadius,
      cornerSmoothing: node.cornerSmoothing
    }

    if (node.type === 'TEXT') {
      copied.isText = true
      copied.fontFamily = node.fontFamily
      copied.fontWeight = node.fontWeight
      copied.fontSize = node.fontSize
      copied.italic = node.italic
      copied.lineHeight = node.lineHeight
      copied.letterSpacing = node.letterSpacing
      copied.textAlignHorizontal = node.textAlignHorizontal
      copied.textAlignVertical = node.textAlignVertical
      copied.textCase = node.textCase
      copied.textDecoration = node.textDecoration
      copied.textAutoResize = node.textAutoResize
    }

    ctx.state.copiedProperties = copied
    return copied
  }

  function pasteProperties(targetIds?: string[]): void {
    const copied = ctx.state.copiedProperties
    if (!copied) return

    const ids = targetIds ?? [...ctx.state.selectedIds]
    if (ids.length === 0) return

    const targets = ids
      .map((id) => ctx.graph.getNode(id))
      .filter((n): n is SceneNode => n !== null && n !== undefined && !n.locked)

    if (targets.length === 0) return

    ctx.undo.runBatch('Paste properties', () => {
      for (const target of targets) {
        const patch: Partial<SceneNode> = {}

        if (copied.fills !== undefined) patch.fills = copyFills(copied.fills)
        if (copied.strokes !== undefined) patch.strokes = copyStrokes(copied.strokes)
        if (copied.borderTopWeight !== undefined) patch.borderTopWeight = copied.borderTopWeight
        if (copied.borderRightWeight !== undefined) {
          patch.borderRightWeight = copied.borderRightWeight
        }
        if (copied.borderBottomWeight !== undefined) {
          patch.borderBottomWeight = copied.borderBottomWeight
        }
        if (copied.borderLeftWeight !== undefined) {
          patch.borderLeftWeight = copied.borderLeftWeight
        }
        if (copied.independentStrokeWeights !== undefined) {
          patch.independentStrokeWeights = copied.independentStrokeWeights
        }
        if (copied.strokeCap !== undefined) patch.strokeCap = copied.strokeCap
        if (copied.strokeJoin !== undefined) patch.strokeJoin = copied.strokeJoin
        if (copied.strokeMiterLimit !== undefined) patch.strokeMiterLimit = copied.strokeMiterLimit
        if (copied.dashPattern !== undefined) {
          patch.dashPattern = copied.dashPattern ? [...copied.dashPattern] : undefined
        }
        if (copied.effects !== undefined) patch.effects = copyEffects(copied.effects)
        if (copied.opacity !== undefined) patch.opacity = copied.opacity
        if (copied.blendMode !== undefined) patch.blendMode = copied.blendMode

        if (target.type !== 'LINE') {
          if (copied.cornerRadius !== undefined) patch.cornerRadius = copied.cornerRadius
          if (copied.topLeftRadius !== undefined) patch.topLeftRadius = copied.topLeftRadius
          if (copied.topRightRadius !== undefined) patch.topRightRadius = copied.topRightRadius
          if (copied.bottomRightRadius !== undefined) {
            patch.bottomRightRadius = copied.bottomRightRadius
          }
          if (copied.bottomLeftRadius !== undefined) {
            patch.bottomLeftRadius = copied.bottomLeftRadius
          }
          if (copied.cornerSmoothing !== undefined) {
            patch.cornerSmoothing = copied.cornerSmoothing
          }
        }

        if (target.type === 'TEXT' && copied.isText) {
          if (copied.fontFamily !== undefined) patch.fontFamily = copied.fontFamily
          if (copied.fontWeight !== undefined) patch.fontWeight = copied.fontWeight
          if (copied.fontSize !== undefined) patch.fontSize = copied.fontSize
          if (copied.italic !== undefined) patch.italic = copied.italic
          if (copied.lineHeight !== undefined) patch.lineHeight = copied.lineHeight
          if (copied.letterSpacing !== undefined) patch.letterSpacing = copied.letterSpacing
          if (copied.textAlignHorizontal !== undefined) {
            patch.textAlignHorizontal = copied.textAlignHorizontal
          }
          if (copied.textAlignVertical !== undefined) {
            patch.textAlignVertical = copied.textAlignVertical
          }
          if (copied.textCase !== undefined) patch.textCase = copied.textCase
          if (copied.textDecoration !== undefined) patch.textDecoration = copied.textDecoration
          if (copied.textAutoResize !== undefined) patch.textAutoResize = copied.textAutoResize
        }

        updateNodeWithUndo(target.id, patch, 'Paste properties')
      }
    })
  }

  return { copyProperties, pasteProperties }
}
