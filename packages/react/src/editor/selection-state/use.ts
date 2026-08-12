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

  // Track selection as an array: a raw Set always JSON-serializes to "{}", which
  // defeats useSceneComputed's change detection (it would never observe an
  // update), leaving selectedIds/hasSelection/selectedCount frozen at mount.
  const selectedIdList = useSceneComputed(() => [...editor.state.selectedIds])
  const selectedIds = useMemo(() => new Set(selectedIdList), [selectedIdList])

  const hasSelection = useMemo(() => selectedIdList.length > 0, [selectedIdList])

  const selectedNode = useSceneComputed<SceneNode | null>(() => editor.getSelectedNode() ?? null)

  const selectedCount = useMemo(() => selectedIdList.length, [selectedIdList])

  const selectedNodeType = useMemo(() => selectedNode?.type ?? null, [selectedNode])

  const isInstance = useMemo(() => selectedNodeType === 'INSTANCE', [selectedNodeType])
  const isComponent = useMemo(() => selectedNodeType === 'COMPONENT', [selectedNodeType])
  const isGroup = useMemo(() => selectedNodeType === 'GROUP', [selectedNodeType])

  const canCreateComponentSet = useSceneComputed(() => {
    const ids = editor.state.selectedIds
    if (ids.size < 2) return false
    for (const id of ids) {
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
