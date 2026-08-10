import React, { useRef, useEffect, useCallback } from 'react'
import { tv } from 'tailwind-variants'
import * as ContextMenu from '@radix-ui/react-context-menu'
import {
  ChevronRight,
  Eye,
  EyeOff,
  Lock,
  Unlock
} from 'lucide-react'
import {
  LayerTreeRoot,
  LayerTreeItem,
  useInlineRename,
  type LayerSelectionMode
} from '@openweave/react'
import { useEditorStore } from '@/app/editor/active-store'
import { COMPONENT_TYPES, nodeIcon } from '@/app/editor/icons'
import layerTreeTheme from '@/theme/layer-tree'
import CanvasMenu from '../canvas/CanvasMenu'

const layerTree = tv(layerTreeTheme)
const INDENT = 16

export default function LayerTree() {
  const store = useEditorStore()
  const pageInputRef = useRef<HTMLInputElement>(null)

  const handleRenameCommit = useCallback((id: string, name: string) => {
    store.renameNode(id, name)
  }, [store])

  const rename = useInlineRename(handleRenameCommit)

  useEffect(() => {
    const renameId = store.state.renameNodeId
    if (renameId) {
      const node = store.graph.getNode(renameId)
      store.state.renameNodeId = null
      if (node) rename.start(node.id, node.name)
    }
  }, [store.state.renameNodeId, store.graph, rename])

  useEffect(() => {
    if (rename.editingId && pageInputRef.current) {
      rename.focusInput(pageInputRef.current)
    }
  }, [rename])

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
      {({ visibleRows, selectedIds, expanded, draggingId, instruction, instructionTargetId, actions }) => {
        const styles = layerTree()

        return (
          <ContextMenu.Root modal={false}>
            <ContextMenu.Trigger asChild>
              <div
                data-test-id="layers-scroll"
                data-slot="viewport"
                className={styles.viewport()}
                onFocus={() => actions.setFocused(true)}
                onBlur={() => actions.setFocused(false)}
              >
                {visibleRows.map(({ node, level, hasChildren }) => {
                  const isSelected = selectedIds.has(node.id)
                  const isExpanded = expanded.includes(node.id)
                  const isDragging = draggingId === node.id
                  const isEditing = rename.editingId === node.id
                  const isComponent = COMPONENT_TYPES.has(node.type)
                  const isChildDropTarget =
                    instructionTargetId === node.id && instruction?.type === 'make-child'
                  const NodeIconComp = nodeIcon(node)

                  const rowStyles = layerTree({
                    selected: isSelected,
                    dragging: isDragging,
                    visible: node.visible,
                    component: isComponent,
                    childDropTarget: isChildDropTarget
                  })

                  const padLeft = `${(level - 1) * INDENT}px`

                  return (
                    <LayerTreeItem
                      key={node.id}
                      node={node}
                      level={level}
                      hasChildren={hasChildren}
                    >
                      {({ actions: itemActions }) => (
                        <div
                          data-test-id="layers-item"
                          data-slot="row"
                          data-node-id={node.id}
                          data-selected={isSelected || undefined}
                          data-dragging={isDragging || undefined}
                          data-hidden={!node.visible || undefined}
                          className={rowStyles.row()}
                          style={{ paddingLeft: padLeft }}
                          onClick={(e) => itemActions.select(getSelectionMode(e).additive)}
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
                              data-test-id="layers-rename-input"
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
                            <button
                              type="button"
                              title={node.locked ? 'Unlock' : 'Lock'}
                              className={rowStyles.action()}
                              onClick={(e) => {
                                e.stopPropagation()
                                itemActions.toggleLock()
                              }}
                            >
                              {node.locked ? (
                                <Lock className={rowStyles.actionIcon()} />
                              ) : (
                                <Unlock className={`${rowStyles.actionIcon()} opacity-0 group-hover/row:opacity-50`} />
                              )}
                            </button>

                            <button
                              type="button"
                              title={node.visible ? 'Hide' : 'Show'}
                              className={rowStyles.action()}
                              onClick={(e) => {
                                e.stopPropagation()
                                itemActions.toggleVisibility()
                              }}
                            >
                              {node.visible ? (
                                <Eye className={`${rowStyles.actionIcon()} opacity-0 group-hover/row:opacity-50`} />
                              ) : (
                                <EyeOff className={rowStyles.actionIcon()} />
                              )}
                            </button>
                          </div>
                        </div>
                      )}
                    </LayerTreeItem>
                  )
                })}
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
