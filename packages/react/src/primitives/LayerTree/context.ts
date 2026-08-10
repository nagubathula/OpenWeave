import { createContext, useContext, type MutableRefObject } from 'react'

import type { Editor } from '@openweave/core/editor'

export interface LayerNode {
  id: string
  name: string
  type: string
  layoutMode: string
  visible: boolean
  locked: boolean
  children?: LayerNode[]
}

export interface LayerRow {
  node: LayerNode
  level: number
  hasChildren: boolean
}

export interface LayerSelectionMode {
  additive: boolean
  range: boolean
}

export interface LayerTreeVirtualizer {
  scrollToIndex: (index: number, options?: { align?: 'auto' | 'center' | 'end' | 'start' }) => void
}

export interface LayerDragInstruction {
  type: 'reorder-above' | 'reorder-below' | 'make-child'
}

export interface LayerTreeContext {
  editor: Editor
  items: LayerNode[]
  expanded: string[]
  visibleRows: LayerRow[]
  treeVersion: number
  selectedIds: Set<string>
  focused: boolean
  indentPerLevel: number
  draggingId: string | null
  instruction: LayerDragInstruction | null
  instructionTargetId: string | null
  setupDrag: (
    el: MutableRefObject<HTMLElement | null>,
    item: () => { id: string; level: number; hasChildren: boolean; parentId: string | null }
  ) => void
  select: (id: string, selection: boolean | LayerSelectionMode) => void
  toggleExpand: (id: string) => void
  setFocused: (focused: boolean) => void
  setVirtualizer: (virtualizer: LayerTreeVirtualizer) => void
  toggleVisibility: (id: string) => void
  toggleLock: (id: string) => void
  rename: (id: string, name: string) => void
  setRowRef: (id: string, el: HTMLElement | null) => void
}

const LayerTreeContextReact = createContext<LayerTreeContext | null>(null)

export function useLayerTree(): LayerTreeContext {
  const ctx = useContext(LayerTreeContextReact)
  if (!ctx) throw new Error('[openweave] useLayerTree() called outside <LayerTreeRoot>')
  return ctx
}

export const LayerTreeProvider = LayerTreeContextReact.Provider
