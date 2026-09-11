import { useRef } from 'react'

import { applyStyleToRange } from '@openweave/core/text'
import { useEditor, useSceneComputed, useSelectionState } from '@openweave/react'
import type { StyleRun } from '@openweave/scene-graph'
import { copyStyleRuns } from '@openweave/scene-graph/copy'
import type { Color } from '@openweave/scene-graph/primitives'

/**
 * Figma-style per-range text color: while inline-editing a text node with a
 * non-collapsed selection, fill color edits restyle just the selected
 * characters via styleRuns. Drag previews re-apply onto a snapshot of the
 * original runs; commit produces one undo step; cancel restores the snapshot.
 */
export function useRangeTextColor() {
  const editor = useEditor()
  const { selectedNode } = useSelectionState()
  const sessionRef = useRef<{ nodeId: string; base: StyleRun[]; range: [number, number] } | null>(
    null
  )

  const active = useSceneComputed<boolean>(() => {
    void editor.state.sceneVersion
    if (!selectedNode || selectedNode.type !== 'TEXT') return false
    if (editor.state.editingTextId !== selectedNode.id) return false
    const range = editor.textEditor?.getSelectionRange()
    return !!range && range[0] !== range[1]
  })

  const rebuild = (nodeId: string) => {
    const updated = editor.graph.getNode(nodeId)
    if (updated) editor.textEditor?.rebuildParagraph(updated)
    editor.requestRender()
  }

  const apply = (color: Color, opacity: number) => {
    const node = selectedNode
    if (!node) return
    if (!sessionRef.current || sessionRef.current.nodeId !== node.id) {
      const range = editor.textEditor?.getSelectionRange()
      if (!range || range[0] === range[1]) return
      sessionRef.current = { nodeId: node.id, base: copyStyleRuns(node.styleRuns), range }
    }
    const { base, range } = sessionRef.current
    const runs = applyStyleToRange(
      base,
      range[0],
      range[1],
      { fills: [{ type: 'SOLID', color: { ...color }, opacity, visible: true }] },
      node.text.length
    )
    editor.updateNode(node.id, { styleRuns: runs })
    rebuild(node.id)
  }

  const commit = () => {
    const session = sessionRef.current
    sessionRef.current = null
    if (!session) return
    editor.commitNodeUpdate(session.nodeId, { styleRuns: session.base }, 'Change text color')
  }

  const cancel = () => {
    const session = sessionRef.current
    sessionRef.current = null
    if (!session) return
    editor.updateNode(session.nodeId, { styleRuns: copyStyleRuns(session.base) })
    rebuild(session.nodeId)
  }

  return { active, apply, commit, cancel }
}
