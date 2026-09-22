import type { DragProtoConnect, DragState } from '#react/shared/input/types'

import { PROTOTYPE_HANDLE_HIT_RADIUS, prototypeHandlePosition } from '@openweave/core/canvas'
import type { Editor } from '@openweave/core/editor'
import type { PrototypeReaction, SceneNode } from '@openweave/scene-graph'

type SetDrag = (drag: DragState) => void

function topLevelAncestorId(editor: Editor, nodeId: string): string {
  let current = editor.graph.getNode(nodeId)
  while (current?.parentId && current.parentId !== editor.state.currentPageId) {
    const parent = editor.graph.getNode(current.parentId)
    if (!parent) break
    current = parent
  }
  return current?.id ?? nodeId
}

/** Nodes whose connector handles are live: top-level frames plus hovered/selected nodes. */
function handleCandidates(editor: Editor): SceneNode[] {
  const seen = new Set<string>()
  const nodes: SceneNode[] = []
  const add = (id: string | null | undefined) => {
    if (!id || seen.has(id)) return
    const node = editor.graph.getNode(id)
    if (!node || !node.visible) return
    seen.add(id)
    nodes.push(node)
  }
  const page = editor.graph.getNode(editor.state.currentPageId)
  for (const childId of page?.childIds ?? []) add(childId)
  for (const id of editor.state.selectedIds) add(id)
  add(editor.state.hoveredNodeId)
  return nodes
}

/**
 * Start a Figma-style prototype connection drag when the pointer lands on a
 * node's connector handle. Returns true when the drag was claimed.
 */
export function startPrototypeConnect(
  cx: number,
  cy: number,
  editor: Editor,
  setDrag: SetDrag
): boolean {
  if (!editor.state.prototypeMode) return false
  const threshold = PROTOTYPE_HANDLE_HIT_RADIUS / editor.state.zoom

  for (const node of handleCandidates(editor)) {
    const handle = prototypeHandlePosition(editor.graph, node)
    if (Math.hypot(cx - handle.x, cy - handle.y) > threshold) continue
    editor.state.prototypeDrag = { sourceId: node.id, cursorX: cx, cursorY: cy }
    editor.setHoveredNode(null)
    editor.requestRepaint()
    setDrag({ type: 'proto-connect', sourceId: node.id })
    return true
  }
  return false
}

export function handlePrototypeConnectMove(
  d: DragProtoConnect,
  cx: number,
  cy: number,
  editor: Editor
): void {
  editor.state.prototypeDrag = { sourceId: d.sourceId, cursorX: cx, cursorY: cy }
  editor.requestRepaint()
}

function findVariantTarget(
  editor: Editor,
  sourceId: string,
  x: number,
  y: number
): SceneNode | null {
  const source = editor.graph.getNode(sourceId)
  if (!source) return null

  let componentSetId: string | null = null
  if (source.type === 'COMPONENT' && source.parentId) {
    const parent = editor.graph.getNode(source.parentId)
    if (parent?.type === 'COMPONENT_SET') componentSetId = parent.id
  } else if (source.type === 'INSTANCE' && source.componentId) {
    const comp = editor.graph.getNode(source.componentId)
    if (comp?.parentId) {
      const parent = editor.graph.getNode(comp.parentId)
      if (parent?.type === 'COMPONENT_SET') componentSetId = parent.id
    }
  }

  if (!componentSetId) return null
  const componentSet = editor.graph.getNode(componentSetId)
  if (!componentSet) return null

  for (const childId of componentSet.childIds) {
    if (childId === sourceId) continue
    const variant = editor.graph.getNode(childId)
    if (!variant || !variant.visible) continue
    const abs = editor.graph.getAbsolutePosition(variant.id)
    if (x >= abs.x && x <= abs.x + variant.width && y >= abs.y && y <= abs.y + variant.height) {
      return variant
    }
  }
  return null
}

interface DropTargetResult {
  target: SceneNode
  isVariant: boolean
}

/** Topmost target containing the point: first checks variant components, then top-level frames. */
function dropTarget(
  editor: Editor,
  sourceId: string,
  x: number,
  y: number
): DropTargetResult | null {
  const variant = findVariantTarget(editor, sourceId, x, y)
  if (variant) return { target: variant, isVariant: true }

  const sourceTopId = topLevelAncestorId(editor, sourceId)
  const page = editor.graph.getNode(editor.state.currentPageId)
  if (!page) return null
  for (let i = page.childIds.length - 1; i >= 0; i--) {
    const frame = editor.graph.getNode(page.childIds[i])
    if (!frame || !frame.visible || frame.id === sourceTopId) continue
    const abs = editor.graph.getAbsolutePosition(frame.id)
    if (x >= abs.x && x <= abs.x + frame.width && y >= abs.y && y <= abs.y + frame.height) {
      return { target: frame, isVariant: false }
    }
  }
  return null
}

/**
 * Finish the connection drag: dropping on another top-level frame creates (or
 * retargets) the source's on-click navigate reaction; dropping on a sibling variant
 * creates a change-to reaction; dropping elsewhere cancels.
 */
export function finishPrototypeConnect(d: DragProtoConnect, editor: Editor): void {
  const drag = editor.state.prototypeDrag
  editor.state.prototypeDrag = null
  editor.requestRepaint()
  if (!drag) return

  const drop = dropTarget(editor, d.sourceId, drag.cursorX, drag.cursorY)
  const source = editor.graph.getNode(d.sourceId)
  if (!drop || !source) return
  const { target, isVariant } = drop

  const actionType = isVariant ? 'CHANGE_TO' : 'NAVIGATE'
  const existingIndex = source.reactions.findIndex(
    (reaction) => reaction.trigger === 'ON_CLICK' && reaction.action === actionType
  )
  const reactions: PrototypeReaction[] =
    existingIndex !== -1
      ? source.reactions.map((reaction, i) =>
          i === existingIndex ? { ...reaction, destinationId: target.id } : reaction
        )
      : [
          ...source.reactions,
          {
            trigger: 'ON_CLICK',
            timeout: 800,
            action: actionType,
            destinationId: target.id,
            url: '',
            transition: isVariant ? 'SMART_ANIMATE' : 'INSTANT',
            transitionDuration: 300,
            easing: isVariant ? 'SPRING' : undefined,
            springPreset: isVariant ? 'BOUNCY' : undefined
          }
        ]

  editor.updateNodeWithUndo(d.sourceId, { reactions }, 'Add interaction')
  editor.select([d.sourceId])
}
