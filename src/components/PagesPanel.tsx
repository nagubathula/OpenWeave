import React, { useRef, useCallback, useEffect } from 'react'
import { tv } from 'tailwind-variants'
import * as ContextMenu from '@radix-ui/react-context-menu'
import { File as IconLucideFile, Pencil as IconLucidePencil, Trash2 as IconLucideTrash2 } from 'lucide-react'
import { PageListRoot, useFlatReorderDrag, useI18n, useInlineRename } from '@openweave/react'
import pageListTheme from '@/theme/page-list'
import Tip from '@/components/ui/Tip'

interface PageItem {
  id: string
  name: string
  childIds: string[]
}

const pageListStyles = tv(pageListTheme)
const baseStyles = pageListStyles()

export default function PagesPanel() {
  const { panels, pages: pageMessages } = useI18n()
  const pageInputRef = useRef<HTMLInputElement>(null)

  const currentPagesRef = useRef<readonly PageItem[]>([])
  const currentMovePageRef = useRef<((id: string, index: number) => void) | null>(null)

  const getPages = useCallback(() => currentPagesRef.current, [])
  const handleMove = useCallback((id: string, index: number) => {
    currentMovePageRef.current?.(id, index)
  }, [])

  const pageReorder = useFlatReorderDrag<PageItem>({
    items: getPages,
    onMove: handleMove
  })

  // Inline `ref={(el) => pageReorder.setupItem(el, ...)}` creates a new
  // function every render, so React detaches+reattaches the drag
  // registration (and its `draggable` attribute) on every re-render, not
  // just mount/unmount. Cache one stable ref-callback per page id instead.
  const rowRefsRef = useRef<Map<string, (el: HTMLElement | null) => void>>(new Map())
  const getRowRef = useCallback((id: string) => {
    let ref = rowRefsRef.current.get(id)
    if (!ref) {
      ref = (el) => pageReorder.setupItem(el, () => ({ id }))
      rowRefsRef.current.set(id, ref)
    }
    return ref
  }, [pageReorder])

  const handleRenameCommit = useCallback((_id: string, _name: string) => {
    // Handled in input onBlur/onKeyDown via actions.rename
  }, [])

  const rename = useInlineRename(handleRenameCommit)

  useEffect(() => {
    if (rename.editingId && pageInputRef.current) {
      rename.focusInput(pageInputRef.current)
    }
  }, [rename])

  function pageDropPosition(pg: PageItem): 'before' | 'after' | undefined {
    if (pageReorder.instructionTargetId !== pg.id) return undefined
    if (pageReorder.instruction?.operation === 'reorder-before') return 'before'
    if (pageReorder.instruction?.operation === 'reorder-after') return 'after'
    return undefined
  }

  function getPageStyles(pg: PageItem, currentPageId: string) {
    return pageListStyles({
      active: pg.id === currentPageId,
      dragging: pageReorder.draggingId === pg.id,
      dropPosition: pageDropPosition(pg)
    })
  }

  return (
    <PageListRoot>
      {({ pages, currentPageId, isDivider, actions }) => {
        currentPagesRef.current = pages
        currentMovePageRef.current = actions.move

        return (
          <div data-test-id="pages-panel" className={baseStyles.panel()}>
            <div className={baseStyles.header()}>
              <span data-test-id="pages-header" className={baseStyles.title()}>
                {panels.pages}
              </span>
              <Tip label={panels.addPage}>
                <button
                  data-test-id="pages-add"
                  className={baseStyles.add()}
                  onClick={actions.add}
                >
                  +
                </button>
              </Tip>
            </div>
            <div className={baseStyles.body()}>
              <div data-test-id="pages-scroll" className={baseStyles.viewport()}>
                {pages.map((pg) => {
                  const styles = getPageStyles(pg, currentPageId)
                  const isEditing = rename.editingId === pg.id
                  const dropPos = pageDropPosition(pg)

                  return (
                    <ContextMenu.Root key={pg.id} modal={false}>
                      <ContextMenu.Trigger asChild>
                        <div
                          data-test-id="pages-row"
                          ref={getRowRef(pg.id)}
                          className={styles.row()}
                          data-page-id={pg.id}
                          data-active={pg.id === currentPageId || undefined}
                          data-dragging={pageReorder.draggingId === pg.id || undefined}
                          data-drop-position={dropPos}
                        >
                          {dropPos === 'before' && (
                            <div
                              data-test-id="pages-drop-indicator"
                              className={styles.dropIndicator()}
                            />
                          )}

                          {isEditing ? (
                            <div className={styles.renameRow()}>
                              <IconLucideFile className={styles.icon()} />
                              <input
                                ref={pageInputRef}
                                data-test-id="pages-item-input"
                                className={styles.renameInput()}
                                defaultValue={pg.name}
                                onBlur={(e) => {
                                  actions.rename(pg.id, e.target.value.trim() || pg.name)
                                  rename.commit(pg.id, e)
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    actions.rename(pg.id, e.currentTarget.value.trim() || pg.name)
                                    rename.commit(pg.id, e)
                                  } else if (e.key === 'Escape') {
                                    rename.cancel()
                                  }
                                }}
                              />
                            </div>
                          ) : (
                            isDivider(pg) ? (
                              <div
                                data-test-id="pages-divider"
                                className={styles.divider()}
                                onDoubleClick={() => rename.start(pg.id, pg.name)}
                              >
                                <div className={styles.dividerLine()} />
                              </div>
                            ) : (
                              <button
                                data-test-id="pages-item"
                                className={styles.item()}
                                onClick={() => actions.switch(pg.id)}
                                onDoubleClick={() => rename.start(pg.id, pg.name)}
                              >
                                <IconLucideFile className={styles.icon()} />
                                <span className={styles.label()}>{pg.name}</span>
                              </button>
                            )
                          )}

                          {dropPos === 'after' && (
                            <div
                              data-test-id="pages-drop-indicator"
                              className={styles.dropIndicator()}
                            />
                          )}
                        </div>
                      </ContextMenu.Trigger>

                      <ContextMenu.Portal>
                        <ContextMenu.Content
                          className="z-50 min-w-36 rounded-md bg-panel p-1 shadow-lg border border-border"
                        >
                          <ContextMenu.Item
                            data-test-id="pages-context-rename"
                            className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-xs outline-none hover:bg-hover hover:text-surface"
                            onSelect={() => rename.start(pg.id, pg.name)}
                          >
                            <IconLucidePencil className="size-3" />
                            <span>{pageMessages.rename}</span>
                          </ContextMenu.Item>
                          <ContextMenu.Item
                            data-test-id="pages-context-delete"
                            disabled={pages.length <= 1}
                            className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-xs outline-none hover:bg-hover hover:text-surface data-[disabled]:opacity-50 data-[disabled]:pointer-events-none"
                            onSelect={() => actions.delete(pg.id)}
                          >
                            <IconLucideTrash2 className="size-3" />
                            <span>{pageMessages.delete}</span>
                          </ContextMenu.Item>
                        </ContextMenu.Content>
                      </ContextMenu.Portal>
                    </ContextMenu.Root>
                  )
                })}
              </div>
            </div>
          </div>
        )
      }}
    </PageListRoot>
  )
}
