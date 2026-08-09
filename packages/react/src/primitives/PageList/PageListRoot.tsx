import React, { useMemo, useCallback } from 'react'
import { usePageList } from './usePageList'
import type { PageNode } from '@openweave/scene-graph'

export interface PageListRootSlotProps {
  pages: PageNode[]
  currentPageId: string
  isDivider: (page: { name: string; childIds: string[] }) => boolean
  actions: {
    add: () => void
    switch: (pageId: string) => void
    rename: (pageId: string, name: string) => void
    delete: (pageId: string) => void
    move: (pageId: string, index: number) => void
  }
}

export interface PageListRootProps {
  dividerPattern?: RegExp
  onAdd?: () => void
  onSwitch?: (pageId: string) => void
  onRename?: (pageId: string, name: string) => void
  onDelete?: (pageId: string) => void
  onMove?: (pageId: string, index: number) => void
  children?: React.ReactNode | ((props: PageListRootSlotProps) => React.ReactNode)
}

export function PageListRoot({
  dividerPattern: customDividerPattern,
  onAdd,
  onSwitch,
  onRename,
  onDelete,
  onMove,
  children
}: PageListRootProps) {
  const { pages, currentPageId, switchPage, addPage, renamePage, deletePage, movePage } =
    usePageList()

  const dividerPattern = customDividerPattern ?? /^[-=*\s]+$/

  const isDivider = useCallback((page: { name: string; childIds: string[] }) => {
    return page.childIds.length === 0 && dividerPattern.test(page.name)
  }, [dividerPattern])

  const handleAdd = useCallback(() => {
    addPage()
    onAdd?.()
  }, [addPage, onAdd])

  const handleSwitch = useCallback((pageId: string) => {
    switchPage(pageId)
    onSwitch?.(pageId)
  }, [switchPage, onSwitch])

  const handleRename = useCallback((pageId: string, name: string) => {
    renamePage(pageId, name)
    onRename?.(pageId, name)
  }, [renamePage, onRename])

  const handleDelete = useCallback((pageId: string) => {
    deletePage(pageId)
    onDelete?.(pageId)
  }, [deletePage, onDelete])

  const handleMove = useCallback((pageId: string, index: number) => {
    movePage(pageId, index)
    onMove?.(pageId, index)
  }, [movePage, onMove])

  const actions = useMemo(() => ({
    add: handleAdd,
    switch: handleSwitch,
    rename: handleRename,
    delete: handleDelete,
    move: handleMove
  }), [handleAdd, handleSwitch, handleRename, handleDelete, handleMove])

  const renderedChildren = typeof children === 'function' ? children({
    pages,
    currentPageId,
    isDivider,
    actions
  }) : children

  return <>{renderedChildren}</>
}

export default PageListRoot
