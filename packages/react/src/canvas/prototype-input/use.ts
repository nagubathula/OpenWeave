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

/** Topmost top-level frame containing the point, excluding the source's own top frame. */
function dropTarget(editor: Editor, sourceId: string, x: number, y: number): SceneNode | null {
  const sourceTopId = topLevelAncestorId(editor, sourceId)
  const page = editor.graph.getNode(editor.state.currentPageId)
  if (!page) return null
  for (let i = page.childIds.length - 1; i >= 0; i--) {
    const frame = editor.graph.getNode(page.childIds[i])
    if (!frame || !frame.visible || frame.id === sourceTopId) continue
    const abs = editor.graph.getAbsolutePosition(frame.id)
    if (x >= abs.x && x <= abs.x + frame.width && y >= abs.y && y <= abs.y + frame.height) {
      return frame
    }
  }
  return null
}

/**
 * Finish the connection drag: dropping on another top-level frame creates (or
 * retargets) the source's on-click navigate reaction; dropping elsewhere cancels.
 */
export function finishPrototypeConnect(d: DragProtoConnect, editor: Editor): void {
  const drag = editor.state.prototypeDrag
  editor.state.prototypeDrag = null
  editor.requestRepaint()
  if (!drag) return

  const target = dropTarget(editor, d.sourceId, drag.cursorX, drag.cursorY)
  const source = editor.graph.getNode(d.sourceId)
  if (!target || !source) return

  const existingIndex = source.reactions.findIndex(
    (reaction) => reaction.trigger === 'ON_CLICK' && reaction.action === 'NAVIGATE'
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
            action: 'NAVIGATE',
            destinationId: target.id,
            url: '',
            transition: 'INSTANT',
            transitionDuration: 300
          }
        ]

  editor.updateNodeWithUndo(d.sourceId, { reactions }, 'Add interaction')
  editor.select([d.sourceId])
}
