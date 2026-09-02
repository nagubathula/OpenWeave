import { useSelectionState } from '#react/editor/selection-state/use'
import { useSceneComputed } from '#react/internal/scene-computed/use'

import { canMakeBooleanSourceNode, hasVisibleStrokeSourceNode } from '@openweave/core/canvas'

/**
 * Returns reactive booleans describing which selection-dependent actions are
 * currently available.
 *
 * This is useful for menus, toolbars, shortcuts, and action buttons that need
 * command-friendly capability checks.
 */
export function useSelectionCapabilities() {
  const selection = useSelectionState()
  const { editor, selectedIds, selectedNode, selectedCount, hasSelection } = selection

  const selectedNodesCanFlatten = useSceneComputed(() => {
    const nodes = editor.getSelectedNodes()
    return nodes.length > 0 && nodes.every((node) => canMakeBooleanSourceNode(node, editor.graph))
  })

  return {
    selectedIds,
    selectedNode,
    canCopy: hasSelection,
    canCut: hasSelection,
    canPaste: true,
    canDelete: hasSelection,
    canDuplicate: hasSelection,
    canExportSelection: hasSelection,
    canGroup: selectedCount >= 2,
    canFrameSelection: hasSelection,
    canUngroup: selection.isGroup,
    canCreateComponent: hasSelection,
    canCreateComponentSet: selection.canCreateComponentSet,
    canDetachInstance: selection.isInstance,
    canWrapInAutoLayout: hasSelection,
    canToggleMask: hasSelection,
    canBringToFront: hasSelection,
    canSendToBack: hasSelection,
    canToggleVisibility: hasSelection,
    canToggleLock: hasSelection,
    canFlip: hasSelection,
    canDistribute: useSceneComputed(() => editor.canDistributeNodes([...editor.state.selectedIds])),
    canBooleanOperation: selectedCount >= 2 && selectedNodesCanFlatten,
    canFlatten: selectedNodesCanFlatten,
    canOutlineText: useSceneComputed(() => {
      const nodes = editor.getSelectedNodes()
      return (
        nodes.length > 0 &&
        nodes.every((node) => node.type === 'TEXT' && canMakeBooleanSourceNode(node, editor.graph))
      )
    }),
    canOutlineStroke: useSceneComputed(() => {
      const nodes = editor.getSelectedNodes()
      return (
        nodes.length > 0 &&
        nodes.every(
          (node) =>
            hasVisibleStrokeSourceNode(node, editor.graph) &&
            canMakeBooleanSourceNode(node, editor.graph)
        )
      )
    }),
    canGoToMainComponent: selection.isInstance,
    canResetOverrides: useSceneComputed(() => {
      const node = editor.getSelectedNodes()[0]
      return (
        node?.type === 'INSTANCE' &&
        (Object.keys(node.overrides).length > 0 ||
          Object.keys(node.componentPropertyAssignments).length > 0)
      )
    }),
    canCreateInstance: selectedNode?.type === 'COMPONENT',
    canMoveToPage: useSceneComputed(() => hasSelection && editor.graph.getPages().length > 1),
    canSetOpacity: hasSelection,
    canSelectAll: useSceneComputed(
      () => editor.graph.getChildren(editor.state.currentPageId).length > 0
    ),
    canUndo: useSceneComputed(() => editor.state.nodeEditState != null || editor.undo.canUndo),
    canRedo: useSceneComputed(() => editor.state.nodeEditState != null || editor.undo.canRedo),
    canZoomToSelection: hasSelection
  }
}
