import * as ContextMenu from '@radix-ui/react-context-menu'
import { ChevronRight, Eye, EyeOff, Lock, Unlock } from 'lucide-react'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { tv } from 'tailwind-variants'

import {
  LayerTreeRoot,
  LayerTreeItem,
  useInlineRename,
  useI18n,
  type LayerSelectionMode
} from '@openweave/react'

import { useEditorStore } from '@/app/editor/active-store'
import { COMPONENT_TYPES, nodeIcon } from '@/app/editor/icons'
import layerTreeTheme from '@/theme/layer-tree'

import CanvasMenu from '../canvas/CanvasMenu'
import Tip from '../ui/Tip'

const layerTree = tv(layerTreeTheme)
const INDENT = 16
// Matches the old Vue tree's `estimate-size: 24` — refined against the real
// rendered row height once rows exist (see the measurement effect below).
const ROW_HEIGHT_ESTIMATE = 24
const OVERSCAN = 8
const NAV_KEYS = new Set(['ArrowDown', 'ArrowUp', 'Home', 'End'])

export default function LayerTree() {
  const store = useEditorStore()
  const { menu } = useI18n()
  const pageInputRef = useRef<HTMLInputElement>(null)

  const handleRenameCommit = useCallback(
    (id: string, name: string) => {
      store.renameNode(id, name)
    },
    [store]
  )

  const rename = useInlineRename(handleRenameCommit)

  // renameNodeId is set from the keyboard/menu layer (Vue store); a render-time
  // dependency misses mutations that don't re-render this tree, so watch it.
  useEffect(() => {
    const consumeRenameRequest = () => {
      const renameId = store.state.renameNodeId
      if (!renameId) return
      const node = store.graph.getNode(renameId)
      store.state.renameNodeId = null
      if (node) rename.start(node.id, node.name)
    }
    consumeRenameRequest()
    return store.subscribeState((key) => {
      if (key === 'renameNodeId') consumeRenameRequest()
    })
  }, [store, rename])

  useEffect(() => {
    if (rename.editingId && pageInputRef.current) {
      rename.focusInput(pageInputRef.current)
    }
  }, [rename])

  // --- Roving-tabindex keyboard navigation ---------------------------------
  // No headless tree lib backs the React primitives (unlike the old Vue tree,
  // which got this for free from reka-ui), so it's hand-rolled here.
  const [focusedId, setFocusedId] = useState<string | null>(null)
  const pendingFocusId = useRef<string | null>(null)
  const rowRefs = useRef(new Map<string, HTMLDivElement>())

  const setRowElRef = useCallback((id: string, el: HTMLDivElement | null) => {
    if (el) rowRefs.current.set(id, el)
    else rowRefs.current.delete(id)
  }, [])

  // --- Fixed-size virtualization --------------------------------------------
  // `LayerTreeVirtualizer` in the SDK is just the interface the consumer is
  // expected to implement (LayerTreeRoot calls `virtualizer.scrollToIndex`
  // and falls back to `scrollIntoView` when none is registered) — there's no
  // actual windowing implementation to mount, so it's implemented here.
  const scrollerRef = useRef<HTMLDivElement | null>(null)
  const [scrollTop, setScrollTop] = useState(0)
  const [viewportHeight, setViewportHeight] = useState(0)
  const [rowHeight, setRowHeight] = useState(ROW_HEIGHT_ESTIMATE)

  useEffect(() => {
    const scroller = scrollerRef.current
    if (!scroller) return
    setViewportHeight(scroller.clientHeight)
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (entry) setViewportHeight(entry.contentRect.height)
    })
    observer.observe(scroller)
    return () => observer.disconnect()
  }, [])

  // Post-render housekeeping: refine the estimated row height against a real
  // rendered row, and focus whatever a keyboard action targeted once it
  // mounts (it may have been outside the virtualized window until the
  // scrollToIndex call above lands).
  useEffect(() => {
    const firstRow = rowRefs.current.values().next().value
    if (firstRow) {
      const measured = firstRow.getBoundingClientRect().height
      if (measured > 0 && Math.abs(measured - rowHeight) > 0.5) {
        setRowHeight(measured)
      }
    }

    const pendingId = pendingFocusId.current
    if (pendingId) {
      const el = rowRefs.current.get(pendingId)
      if (el) {
        el.focus()
        pendingFocusId.current = null
      }
    }
  })

  const scrollToIndex = useCallback(
    (index: number, options?: { align?: 'auto' | 'center' | 'end' | 'start' }) => {
      const scroller = scrollerRef.current
      if (!scroller) return
      const rowTop = index * rowHeight
      const rowBottom = rowTop + rowHeight
      const viewTop = scroller.scrollTop
      const viewBottom = viewTop + scroller.clientHeight
      const align = options?.align ?? 'auto'

      if (align === 'start') scroller.scrollTop = rowTop
      else if (align === 'end') scroller.scrollTop = rowBottom - scroller.clientHeight
      else if (align === 'center')
        scroller.scrollTop = rowTop - scroller.clientHeight / 2 + rowHeight / 2
      else if (rowTop < viewTop) scroller.scrollTop = rowTop
      else if (rowBottom > viewBottom) scroller.scrollTop = rowBottom - scroller.clientHeight
    },
    [rowHeight]
  )

  function onLayerContextMenu(_e: React.MouseEvent, nodeId: string) {
    if (!store.state.selectedIds.has(nodeId)) {
      store.select([nodeId])
    }
  }

  function getSelectionMode(e: React.MouseEvent): LayerSelectionMode {
    return {
      additive: e.metaKey || e.ctrlKey,
      range: e.shiftKey
    }
  }

  return (
    <LayerTreeRoot indentPerLevel={INDENT}>
      {({
        visibleRows,
        selectedIds,
        expanded,
        draggingId,
        instruction,
        instructionTargetId,
        focused,
        actions
      }) => {
        const styles = layerTree()

        // Register our windowing implementation so LayerTreeRoot's own
        // scroll-to-selection logic (`scrollToNode`) drives it instead of
        // falling back to plain `scrollIntoView`.
        actions.setVirtualizer({ scrollToIndex })

        const rowCount = visibleRows.length
        const startIndex = Math.max(0, Math.floor(scrollTop / rowHeight) - OVERSCAN)
        const endIndex = Math.min(
          rowCount,
          Math.ceil((scrollTop + viewportHeight) / rowHeight) + OVERSCAN
        )
        const topSpacer = startIndex * rowHeight
        const bottomSpacer = (rowCount - endIndex) * rowHeight
        const windowedRows = visibleRows.slice(startIndex, endIndex)

        const activeId =
          focusedId ??
          visibleRows.find((row) => selectedIds.has(row.node.id))?.node.id ??
          visibleRows[0]?.node.id ??
          null

        const onViewportKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
          if (!NAV_KEYS.has(e.key)) return
          if ((e.target as HTMLElement).tagName === 'INPUT') return
          if (rowCount === 0) return
          e.preventDefault()

          const currentIndex = activeId
            ? visibleRows.findIndex((row) => row.node.id === activeId)
            : -1
          let nextIndex = currentIndex
          if (e.key === 'Home') nextIndex = 0
          else if (e.key === 'End') nextIndex = rowCount - 1
          else if (e.key === 'ArrowDown') {
            nextIndex = currentIndex < 0 ? 0 : Math.min(currentIndex + 1, rowCount - 1)
          } else if (e.key === 'ArrowUp') {
            nextIndex = currentIndex < 0 ? 0 : Math.max(currentIndex - 1, 0)
          }

          const nextNode = visibleRows[nextIndex]?.node
          if (!nextNode) return
          setFocusedId(nextNode.id)
          pendingFocusId.current = nextNode.id
          actions.select(nextNode.id, false)
        }

        return (
          <ContextMenu.Root modal={false}>
            <ContextMenu.Trigger asChild>
              <div
                data-test-id="layers-scroll"
                data-slot="viewport"
                role="tree"
                className={styles.viewport()}
                ref={scrollerRef}
                onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
                onFocus={() => actions.setFocused(true)}
                onBlur={() => actions.setFocused(false)}
                onKeyDown={onViewportKeyDown}
              >
                {topSpacer > 0 && <div style={{ height: topSpacer }} />}
                {windowedRows.map(({ node, level, hasChildren }) => {
                  const isSelected = selectedIds.has(node.id)
                  const isExpanded = expanded.includes(node.id)
                  const isDragging = draggingId === node.id
                  const isEditing = rename.editingId === node.id
                  const isComponent = COMPONENT_TYPES.has(node.type)
                  const dropPosition =
                    instructionTargetId === node.id && instruction
                      ? instruction.type === 'make-child'
                        ? ('child' as const)
                        : instruction.type === 'reorder-above'
                          ? ('above' as const)
                          : ('below' as const)
                      : undefined
                  const isChildDropTarget = dropPosition === 'child'
                  const NodeIconComp = nodeIcon(node)

                  const rowStyles = layerTree({
                    selected: isSelected,
                    focused,
                    dragging: isDragging,
                    visible: node.visible,
                    component: isComponent,
                    childDropTarget: isChildDropTarget,
                    dropPosition
                  })

                  const padLeft = `${(level - 1) * INDENT}px`
                  const dropIndicatorStyle: React.CSSProperties | undefined = dropPosition
                    ? dropPosition === 'child'
                      ? { left: `${level * INDENT}px`, right: '4px' }
                      : {
                          left: `${(level - 1) * INDENT}px`,
                          width: `calc(100% - ${(level - 1) * INDENT}px)`
                        }
                    : undefined

                  return (
                    <LayerTreeItem
                      key={node.id}
                      node={node}
                      level={level}
                      hasChildren={hasChildren}
                    >
                      {({ actions: itemActions }) => (
                        <div
                          ref={(el) => setRowElRef(node.id, el)}
                          data-test-id="layers-item"
                          data-slot="row"
                          data-selected={isSelected || undefined}
                          data-dragging={isDragging || undefined}
                          data-hidden={!node.visible || undefined}
                          data-drop-position={isChildDropTarget ? 'child' : undefined}
                          role="treeitem"
                          aria-selected={isSelected}
                          aria-expanded={hasChildren ? isExpanded : undefined}
                          aria-level={level}
                          tabIndex={activeId === node.id ? 0 : -1}
                          className={rowStyles.row()}
                          style={{ paddingLeft: padLeft }}
                          onClick={(e) => {
                            setFocusedId(node.id)
                            itemActions.select(getSelectionMode(e))
                          }}
                          onContextMenu={(e) => onLayerContextMenu(e, node.id)}
                          onDoubleClick={() => rename.start(node.id, node.name)}
                        >
                          {hasChildren ? (
                            <button
                              type="button"
                              className={`${rowStyles.disclosure()} ${isExpanded ? 'rotate-90' : ''}`}
                              onClick={(e) => {
                                e.stopPropagation()
                                itemActions.toggleExpand()
                              }}
                            >
                              <ChevronRight className="size-3" />
                            </button>
                          ) : (
                            <div className={rowStyles.disclosurePlaceholder()} />
                          )}

                          <NodeIconComp className={rowStyles.icon()} />

                          {isEditing ? (
                            <input
                              ref={pageInputRef}
                              data-test-id="layers-item-input"
                              className={rowStyles.renameInput()}
                              defaultValue={node.name}
                              onBlur={(e) => {
                                itemActions.rename(e.target.value.trim() || node.name)
                                rename.commit(node.id, e)
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  itemActions.rename(e.currentTarget.value.trim() || node.name)
                                  rename.commit(node.id, e)
                                } else if (e.key === 'Escape') {
                                  rename.cancel()
                                }
                              }}
                            />
                          ) : (
                            <span data-slot="label" className={rowStyles.label()}>
                              {node.name}
                            </span>
                          )}

                          <div className={rowStyles.actions()}>
                            <Tip label={node.locked ? menu.unlock : menu.lock}>
                              <button
                                type="button"
                                aria-label={node.locked ? menu.unlock : menu.lock}
                                className={rowStyles.action()}
                                onPointerDown={(e) => e.stopPropagation()}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  itemActions.toggleLock()
                                }}
                              >
                                {node.locked ? (
                                  <Lock className={rowStyles.actionIcon()} />
                                ) : (
                                  <Unlock
                                    className={`${rowStyles.actionIcon()} opacity-0 group-hover/row:opacity-50`}
                                  />
                                )}
                              </button>
                            </Tip>

                            <Tip label={node.visible ? menu.hide : menu.show}>
                              <button
                                type="button"
                                aria-label={node.visible ? menu.hide : menu.show}
                                className={rowStyles.action()}
                                onPointerDown={(e) => e.stopPropagation()}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  itemActions.toggleVisibility()
                                }}
                              >
                                {node.visible ? (
                                  <Eye
                                    className={`${rowStyles.actionIcon()} opacity-0 group-hover/row:opacity-50`}
                                  />
                                ) : (
                                  <EyeOff className={rowStyles.actionIcon()} />
                                )}
                              </button>
                            </Tip>
                          </div>

                          {dropPosition && (
                            <div
                              data-slot="drop-indicator"
                              data-drop-position={dropPosition}
                              className={rowStyles.dropIndicator()}
                              style={dropIndicatorStyle}
                            />
                          )}
                        </div>
                      )}
                    </LayerTreeItem>
                  )
                })}
                {bottomSpacer > 0 && <div style={{ height: bottomSpacer }} />}
              </div>
            </ContextMenu.Trigger>

            <ContextMenu.Portal>
              <CanvasMenu />
            </ContextMenu.Portal>
          </ContextMenu.Root>
        )
      }}
    </LayerTreeRoot>
  )
}
