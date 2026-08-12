import React, { type ComponentType } from 'react'
import * as ContextMenu from '@radix-ui/react-context-menu'
import {
  Combine as IconCombine,
  MinusSquare as IconCopyMinus,
  XSquare as IconCopyX,
  ListCollapse as IconListCollapse,
  Spline as IconSpline,
  Type as IconTypeOutline,
  LayoutGrid as IconSquaresIntersect
} from 'lucide-react'

import {
  useEditorCommands,
  useI18n,
  useMenuModel,
  useSelectionState,
  editorCommandMetadata,
  formatShortcut
} from '@openweave/react'
import type { EditorCommandId } from '@openweave/react'

import { useEditorStore } from '@/app/editor/active-store'
import { appMenuShortcutLabel } from '@/app/shell/menu/shortcut'
import { createCanvasMenuActions } from '@/app/editor/canvas/menu/actions'
import { useCanvasContextMenu } from '@/app/editor/canvas/menu/context'
import { canvasMenuItemClass, canvasMenuShortcutClass } from '@/app/editor/canvas/menu/model'
import AppShortcutText from '@/components/ui/AppShortcutText'
import { menu, useMenuUI } from '@/components/ui/menu'

const booleanCommandIcons: Partial<Record<EditorCommandId, ComponentType<{ className?: string }>>> = {
  'selection.booleanUnion': IconCombine,
  'selection.booleanSubtract': IconCopyMinus,
  'selection.booleanIntersect': IconSquaresIntersect,
  'selection.booleanExclude': IconCopyX,
  'selection.flatten': IconListCollapse,
  'selection.outlineText': IconTypeOutline,
  'selection.outlineStroke': IconSpline
}

function contextCommandTestId(id?: EditorCommandId): string | undefined {
  return id ? editorCommandMetadata(id).contextTestId : undefined
}

function contextCommandIcon(id?: EditorCommandId): ComponentType<{ className?: string }> | undefined {
  if (!id) return undefined
  return booleanCommandIcons[id]
}

export default function CanvasMenu() {
  const store = useEditorStore()

  const { editor, selectedIds, hasSelection } = useSelectionState()
  const { getCommand } = useEditorCommands()
  const { canvasMenu } = useMenuModel()
  const { menu: t } = useI18n()

  const canvasMenuActions = createCanvasMenuActions(store, Array.from(selectedIds))
  const { execCommand } = canvasMenuActions
  const contextMenu = useCanvasContextMenu(canvasMenu, hasSelection, editor, canvasMenuActions, t)

  const menuCls = useMenuUI({
    content: 'min-w-56 shadow-[0_8px_30px_rgb(0_0_0/0.4)] animate-in fade-in zoom-in-95',
    separator: 'my-1'
  })
  const componentMenu = menu({ tone: 'component' })

  const cls = {
    menu: menuCls.content,
    submenu: menuCls.content.replace('min-w-56', 'min-w-0 w-max'),
    item: menuCls.item,
    component: componentMenu.item(),
    sep: menuCls.separator
  }

  return (
    <ContextMenu.Content className={cls.menu}>
      <ContextMenu.Item
        data-test-id="context-copy"
        className={cls.item}
        disabled={!hasSelection}
        onSelect={() => execCommand('copy')}
      >
        <span>{t.copy}</span>
        <AppShortcutText>{appMenuShortcutLabel('copy')}</AppShortcutText>
      </ContextMenu.Item>
      <ContextMenu.Item
        data-test-id="context-cut"
        className={cls.item}
        disabled={!hasSelection}
        onSelect={() => execCommand('cut')}
      >
        <span>{t.cut}</span>
        <AppShortcutText>{appMenuShortcutLabel('cut')}</AppShortcutText>
      </ContextMenu.Item>
      <ContextMenu.Item
        data-test-id="context-paste"
        className={cls.item}
        onSelect={() => execCommand('paste')}
      >
        <span>{t.pasteHere}</span>
        <AppShortcutText>{appMenuShortcutLabel('paste')}</AppShortcutText>
      </ContextMenu.Item>
      <ContextMenu.Item
        data-test-id="context-paste-to-replace"
        className={cls.item}
        disabled={!hasSelection}
        onSelect={() => { void canvasMenuActions.pasteToReplace() }}
      >
        <span>{t.pasteToReplace}</span>
      </ContextMenu.Item>
      <ContextMenu.Item
        data-test-id="context-duplicate"
        className={cls.item}
        disabled={!hasSelection}
        onSelect={() => getCommand('selection.duplicate').run()}
      >
        <span>{getCommand('selection.duplicate').label}</span>
        <AppShortcutText>
          {formatShortcut(editorCommandMetadata('selection.duplicate').shortcut)}
        </AppShortcutText>
      </ContextMenu.Item>
      <ContextMenu.Item
        data-test-id="context-delete"
        className={cls.item}
        disabled={!hasSelection}
        onSelect={() => getCommand('selection.delete').run()}
      >
        <span>{getCommand('selection.delete').label}</span>
        <AppShortcutText>
          {formatShortcut(editorCommandMetadata('selection.delete').shortcut)}
        </AppShortcutText>
      </ContextMenu.Item>

      {contextMenu.map((item, i) => {
        const node = item as unknown as { separator?: boolean; sub?: any[]; id?: string; label?: string; testId?: string; disabled?: boolean; action?: () => void; name?: string; shortcut?: string }
        if (node.separator) {
          return <ContextMenu.Separator key={`menu-${i}`} className={cls.sep} />
        }

        if (node.sub) {
          return (
            <ContextMenu.Sub key={`menu-${i}`}>
              <ContextMenu.SubTrigger data-test-id={node.testId} className={cls.item}>
                <span>{node.label}</span>
                <span className="text-sm text-muted">›</span>
              </ContextMenu.SubTrigger>
              <ContextMenu.Portal>
                <ContextMenu.SubContent className={cls.submenu}>
                  {(node.sub || []).map((subItem: any, j: number) => {
                    const subItemTyped = subItem as { id: string; label?: string; separator?: boolean; testId?: string; disabled?: boolean; action?: () => void; name?: string; shortcut?: string }
                    const SubIcon = contextCommandIcon(subItemTyped.id as any)
                    return (
                      <ContextMenu.Item
                        key={j}
                        className={cls.item}
                        data-test-id={subItemTyped.separator ? undefined : subItemTyped.testId}
                        disabled={subItemTyped.separator ? true : subItemTyped.disabled}
                        onSelect={(e) => {
                          if (!subItemTyped.separator && subItemTyped.action) {
                            subItemTyped.action()
                          } else {
                            e.preventDefault()
                          }
                        }}
                      >
                        <div className="flex w-full items-center justify-between gap-4">
                          <span className="flex items-center gap-2">
                            {SubIcon && <SubIcon className="h-4 w-4" />}
                            <span>{subItemTyped.name || subItemTyped.label}</span>
                          </span>
                          {subItemTyped.shortcut && (
                            <span className="text-muted">{subItemTyped.shortcut}</span>
                          )}
                        </div>
                      </ContextMenu.Item>
                    )
                  })}
                </ContextMenu.SubContent>
              </ContextMenu.Portal>
            </ContextMenu.Sub>
          )
        }

        const actionId = ((node as any).id || (node as any).actionId) as string
        const Icon = contextCommandIcon(actionId as any)
        return (
          <ContextMenu.Item
            key={`menu-${i}`}
            data-test-id={node.testId ?? contextCommandTestId(actionId as any)}
            className={canvasMenuItemClass((node.label || '') as string, cls)}
            disabled={!!(node as any).disabled}
            onSelect={(e) => {
              if (node.action) {
                node.action()
              } else {
                e.preventDefault()
              }
            }}
          >
            <span className="flex min-w-0 flex-1 items-center gap-2">
              {Icon && <Icon className="size-3.5 shrink-0 text-muted" />}
              <span className="truncate">{(node as any).name || (node as any).label || actionId}</span>
            </span>
            {node.shortcut && (
              <span className={`text-[11px] ${canvasMenuShortcutClass((node.label || '') as string)}`}>
                {node.shortcut}
              </span>
            )}
          </ContextMenu.Item>
        )
      })}
    </ContextMenu.Content>
  )
}
