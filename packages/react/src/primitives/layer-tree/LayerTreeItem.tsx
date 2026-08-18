import React, { useMemo, useRef } from 'react'

import { useLayerTree } from './context'
import type { LayerNode, LayerSelectionMode } from './context'

export interface LayerTreeItemSlotProps {
  node: LayerNode
  level: number
  hasChildren: boolean
  isSelected: boolean
  isDragging: boolean
  focused: boolean
  padLeft: string
  actions: {
    select: (selection: boolean | LayerSelectionMode) => void
    toggleExpand: () => void
    toggleVisibility: () => void
    toggleLock: () => void
    rename: (name: string) => void
  }
}

export interface LayerTreeItemProps {
  node: LayerNode
  level: number
  hasChildren: boolean
  onSelect?: (id: string, additive: boolean) => void
  onToggleExpand?: (id: string) => void
  onToggleVisibility?: (id: string) => void
  onToggleLock?: (id: string) => void
  onRename?: (id: string, name: string) => void
  children?: React.ReactNode | ((props: LayerTreeItemSlotProps) => React.ReactNode)
}

export function LayerTreeItem({
  node,
  level,
  hasChildren,
  onSelect,
  onToggleExpand,
  onToggleVisibility,
  onToggleLock,
  onRename,
  children
}: LayerTreeItemProps) {
  const ctx = useLayerTree()
  const rowEl = useRef<HTMLDivElement | null>(null)

  const isSelected = ctx.selectedIds.has(node.id)
  const isDragging = ctx.draggingId === node.id
  const padLeft = `${(level - 1) * ctx.indentPerLevel}px`

  const onRef = (el: HTMLDivElement | null) => {
    rowEl.current = el
    ctx.setRowRef(node.id, el)
  }

  // Set up pragmatic drag and drop via the context helper
  ctx.setupDrag(rowEl, () => ({
    id: node.id,
    level,
    hasChildren,
    parentId: null
  }))

  const actions = useMemo(
    () => ({
      select: (selection: boolean | LayerSelectionMode) => {
        const additive = typeof selection === 'boolean' ? selection : selection.additive
        onSelect?.(node.id, additive)
        ctx.select(node.id, selection)
      },
      toggleExpand: () => {
        onToggleExpand?.(node.id)
        ctx.toggleExpand(node.id)
      },
      toggleVisibility: () => {
        onToggleVisibility?.(node.id)
        ctx.toggleVisibility(node.id)
      },
      toggleLock: () => {
        onToggleLock?.(node.id)
        ctx.toggleLock(node.id)
      },
      rename: (name: string) => {
        onRename?.(node.id, name)
        ctx.rename(node.id, name)
      }
    }),
    [ctx, node.id, onSelect, onToggleExpand, onToggleVisibility, onToggleLock, onRename]
  )

  const renderedChildren =
    typeof children === 'function'
      ? children({
          node,
          level,
          hasChildren,
          isSelected,
          isDragging,
          focused: ctx.focused,
          padLeft,
          actions
        })
      : children

  return (
    <div ref={onRef} data-node-id={node.id} className="w-full">
      {renderedChildren}
    </div>
  )
}

export default LayerTreeItem
