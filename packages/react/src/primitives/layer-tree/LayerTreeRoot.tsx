import { useEditor } from '#react/editor/context'
import { useSceneComputed } from '#react/internal/scene-computed/use'
import React, { useState, useMemo, useEffect, useRef } from 'react'

import type { SceneNode } from '@openweave/scene-graph'

import { LayerTreeProvider } from './context'
import type {
  LayerNode,
  LayerSelectionMode,
  LayerTreeVirtualizer,
  LayerRow,
  LayerDragInstruction
} from './context'
import {
  buildLayerTreeModel,
  layerSelectionForTarget,
  patchLayerNode,
  visibleLayerRows
} from './model'
import { useLayerDrag } from './useLayerDrag'

export interface LayerTreeRootSlotProps {
  items: LayerNode[]
  visibleRows: LayerRow[]
  expanded: string[]
  treeVersion: number
  selectedIds: Set<string>
  focused: boolean
  draggingId: string | null
  instruction: LayerDragInstruction | null
  instructionTargetId: string | null
  actions: {
    select: (id: string, selection: boolean | LayerSelectionMode) => void
    toggleExpand: (id: string) => void
    setFocused: (value: boolean) => void
    setVirtualizer: (virtualizer: LayerTreeVirtualizer) => void
  }
}

export interface LayerTreeRootProps {
  indentPerLevel?: number
  onSelect?: (id: string, additive: boolean) => void
  onToggleExpand?: (id: string) => void
  onToggleVisibility?: (id: string) => void
  onToggleLock?: (id: string) => void
  onRename?: (id: string, name: string) => void
  children?: React.ReactNode | ((props: LayerTreeRootSlotProps) => React.ReactNode)
}

const PATCHABLE_NODE_KEYS = new Set<keyof SceneNode>([
  'name',
  'type',
  'layoutMode',
  'visible',
  'locked'
])

export function LayerTreeRoot({
  indentPerLevel = 16,
  onSelect,
  onToggleExpand,
  onToggleVisibility,
  onToggleLock,
  onRename,
  children
}: LayerTreeRootProps) {
  const editor = useEditor()
  const [items, setItems] = useState<LayerNode[]>([])
  const [expanded, setExpanded] = useState<string[]>([])
  const [treeVersion, setTreeVersion] = useState(0)
  const [focused, setFocused] = useState(false)

  const selectedIds = useSceneComputed(() => editor.state.selectedIds)
  const visibleRows = useMemo(() => visibleLayerRows(items, new Set(expanded)), [items, expanded])

  const nodesById = useRef(new Map<string, LayerNode>())
  const virtualizer = useRef<LayerTreeVirtualizer | null>(null)
  const selectionAnchorId = useRef<string | null>(null)
  const applyingSelection = useRef(false)
  const rowRefs = useRef(new Map<string, HTMLElement>())

  const expandNode = (id: string) => {
    setExpanded((prev) => {
      if (!prev.includes(id)) return [...prev, id]
      return prev
    })
  }

  const { draggingId, instruction, instructionTargetId, setupItem } = useLayerDrag(
    editor,
    indentPerLevel,
    expandNode
  )

  const rebuildTree = () => {
    const model = buildLayerTreeModel(editor.graph, editor.state.currentPageId)
    setItems(model.items)
    nodesById.current = model.byId
    setExpanded((prev) => prev.filter((id) => model.byId.has(id)))
    setTreeVersion((v) => v + 1)
  }

  // Initial build
  useEffect(() => {
    rebuildTree()
  }, [editor.state.currentPageId])

  const patchTreeNode = (id: string, changes: Partial<SceneNode>) => {
    if ('childIds' in changes || 'parentId' in changes) {
      rebuildTree()
      return
    }
    if (
      !(Object.keys(changes) as (keyof SceneNode)[]).some((key) => PATCHABLE_NODE_KEYS.has(key))
    ) {
      return
    }
    const target = nodesById.current.get(id)
    const source = editor.graph.getNode(id)
    if (target && source) {
      if (patchLayerNode(target, source)) {
        setTreeVersion((v) => v + 1) // Force update
      }
    }
  }

  const setRowRef = (id: string, el: HTMLElement | null) => {
    if (el) rowRefs.current.set(id, el)
    else rowRefs.current.delete(id)
  }

  const expandSelectionAncestors = (ids: readonly string[]) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      for (const id of ids) {
        let node = editor.graph.getNode(id)
        while (node?.parentId && node.parentId !== editor.state.currentPageId) {
          next.add(node.parentId)
          node = editor.graph.getNode(node.parentId)
        }
      }
      if (next.size !== prev.length) return Array.from(next)
      return prev
    })
  }

  const scrollToNode = (id: string) => {
    setTimeout(() => {
      const index = visibleRows.findIndex((row) => row.node.id === id)
      if (index !== -1 && virtualizer.current) {
        virtualizer.current.scrollToIndex(index, { align: 'auto' })
        return
      }
      rowRefs.current.get(id)?.scrollIntoView({ block: 'nearest' })
    }, 0)
  }

  const onSelectionChanged = (ids: string[]) => {
    expandSelectionAncestors(ids)
    if (applyingSelection.current) return
    const visibleIds = new Set(visibleRows.map((row) => row.node.id))
    selectionAnchorId.current = ids.find((id) => visibleIds.has(id)) ?? null
    if (selectionAnchorId.current) scrollToNode(selectionAnchorId.current)
  }

  useEffect(() => {
    const unsubscribe = [
      editor.onEditorEvent('graph:replaced', rebuildTree),
      editor.onEditorEvent('page:changed', rebuildTree),
      editor.onEditorEvent('node:created', rebuildTree),
      editor.onEditorEvent('node:deleted', rebuildTree),
      editor.onEditorEvent('node:reparented', rebuildTree),
      editor.onEditorEvent('node:reordered', rebuildTree),
      editor.onEditorEvent('node:updated', patchTreeNode),
      editor.onEditorEvent('selection:changed', onSelectionChanged)
    ]

    return () => {
      for (const stop of unsubscribe) stop()
    }
  }, [editor, items, expanded, visibleRows])

  const syncCanvasScope = (nodeId: string) => {
    const node = editor.graph.getNode(nodeId)
    if (!node) return
    let parentId = node.parentId
    while (parentId && parentId !== editor.state.currentPageId) {
      if (editor.graph.isContainer(parentId)) {
        editor.enterContainer(parentId)
        return
      }
      const parent = editor.graph.getNode(parentId)
      parentId = parent?.parentId ?? null
    }
    editor.state.enteredContainerId = null
  }

  const select = (id: string, selection: boolean | LayerSelectionMode) => {
    const mode = typeof selection === 'boolean' ? { additive: selection, range: false } : selection
    onSelect?.(id, mode.additive)
    const visibleIds = visibleRows.map((row) => row.node.id)
    const next = layerSelectionForTarget(
      visibleIds,
      editor.state.selectedIds,
      selectionAnchorId.current,
      id,
      mode
    )
    if (!mode.range) selectionAnchorId.current = id
    applyingSelection.current = true
    try {
      editor.select([...next])
    } finally {
      applyingSelection.current = false
    }
    if (!mode.additive && !mode.range) syncCanvasScope(id)
    scrollToNode(id)
  }

  const toggleExpand = (id: string) => {
    onToggleExpand?.(id)
    setExpanded((prev) => {
      const index = prev.indexOf(id)
      if (index !== -1) return prev.filter((expandedId) => expandedId !== id)
      return [...prev, id]
    })
  }

  const actions = useMemo(
    () => ({
      select,
      toggleExpand,
      setFocused: (value: boolean) => setFocused(value),
      setVirtualizer: (v: LayerTreeVirtualizer) => {
        virtualizer.current = v
      }
    }),
    [editor, visibleRows]
  )

  const contextValue = useMemo(
    () => ({
      editor,
      items,
      expanded,
      visibleRows,
      treeVersion,
      selectedIds,
      focused,
      indentPerLevel,
      draggingId,
      instruction,
      instructionTargetId,
      setupDrag: setupItem,
      select,
      toggleExpand,
      setFocused: actions.setFocused,
      setVirtualizer: actions.setVirtualizer,
      toggleVisibility: (id: string) => {
        onToggleVisibility?.(id)
        editor.toggleNodeVisibility(id)
      },
      toggleLock: (id: string) => {
        onToggleLock?.(id)
        editor.toggleNodeLock(id)
      },
      rename: (id: string, name: string) => {
        onRename?.(id, name)
        editor.renameNode(id, name)
      },
      setRowRef
    }),
    [
      editor,
      items,
      expanded,
      visibleRows,
      treeVersion,
      selectedIds,
      focused,
      indentPerLevel,
      draggingId,
      instruction,
      instructionTargetId,
      setupItem,
      select,
      toggleExpand,
      actions.setFocused,
      actions.setVirtualizer,
      onToggleVisibility,
      onToggleLock,
      onRename
    ]
  )

  const renderedChildren =
    typeof children === 'function'
      ? children({
          items,
          visibleRows,
          expanded,
          treeVersion,
          selectedIds,
          focused,
          draggingId,
          instruction,
          instructionTargetId,
          actions
        })
      : children

  return (
    <LayerTreeProvider value={contextValue}>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{renderedChildren}</div>
    </LayerTreeProvider>
  )
}

export default LayerTreeRoot
