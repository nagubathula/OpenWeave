import { useMemo } from 'react'

import type { SceneNode } from '@openweave/scene-graph'

import { useEditor } from '#react/editor/context'
import { useSceneComputed } from '#react/internal/scene-computed/use'

/**
 * Returns reactive selection-derived state for the current editor.
 *
 * Use this hook to drive UI from the current selection without manually
 * reading graph state in every component.
 */
export function useSelectionState() {
  const editor = useEditor()

  const selectedIds = useSceneComputed(() => editor.state.selectedIds)

  const hasSelection = useMemo(() => selectedIds.size > 0, [selectedIds])

  const selectedNode = useSceneComputed<SceneNode | null>(() => editor.getSelectedNode() ?? null)

  const selectedCount = useMemo(() => selectedIds.size, [selectedIds])

  const selectedNodeType = useMemo(() => selectedNode?.type ?? null, [selectedNode])

  const isInstance = useMemo(() => selectedNodeType === 'INSTANCE', [selectedNodeType])
  const isComponent = useMemo(() => selectedNodeType === 'COMPONENT', [selectedNodeType])
  const isGroup = useMemo(() => selectedNodeType === 'GROUP', [selectedNodeType])

  const canCreateComponentSet = useSceneComputed(() => {
    if (selectedIds.size < 2) return false
    for (const id of selectedIds) {
      if (editor.graph.getNode(id)?.type !== 'COMPONENT') return false
    }
    return true
  })

  return {
    editor,
    selectedIds,
    hasSelection,
    selectedNode,
    selectedCount,
    selectedNodeType,
    isInstance,
    isComponent,
    isGroup,
    canCreateComponentSet
  }
}
