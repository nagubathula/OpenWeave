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
        const node = item as any
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
                  {node.sub.map((subItem: any, j: number) => {
                    const SubIcon = contextCommandIcon(subItem.id)
                    return (
                      <ContextMenu.Item
                        key={j}
                        className={cls.item}
                        data-test-id={subItem.separator ? undefined : subItem.testId}
                        disabled={subItem.separator ? true : subItem.disabled}
                        onSelect={(e) => {
                          if (!subItem.separator && subItem.action) {
                            subItem.action()
                          } else {
                            e.preventDefault()
                          }
                        }}
                      >
                        {!subItem.separator && (
                          <>
                            <span className="flex min-w-0 flex-1 items-center gap-2">
                              {SubIcon && <SubIcon className="size-3.5 shrink-0 text-muted" />}
                              <span className="truncate">{subItem.label}</span>
                            </span>
                            {subItem.shortcut && (
                              <AppShortcutText>{subItem.shortcut}</AppShortcutText>
                            )}
                          </>
                        )}
                      </ContextMenu.Item>
                    )
                  })}
                </ContextMenu.SubContent>
              </ContextMenu.Portal>
            </ContextMenu.Sub>
          )
        }

        const ItemIcon = contextCommandIcon(node.id)
        return (
          <ContextMenu.Item
            key={`menu-${i}`}
            data-test-id={node.testId ?? contextCommandTestId(node.id)}
            className={canvasMenuItemClass(node.label, cls)}
            disabled={node.disabled}
            onSelect={(e) => {
              if (node.action) {
                node.action()
              } else {
                e.preventDefault()
              }
            }}
          >
            <span className="flex min-w-0 flex-1 items-center gap-2">
              {ItemIcon && <ItemIcon className="size-3.5 shrink-0 text-muted" />}
              <span className="truncate">{node.label}</span>
            </span>
            {node.shortcut && (
              <span className={`text-[11px] ${canvasMenuShortcutClass(node.label)}`}>
                {node.shortcut}
              </span>
            )}
          </ContextMenu.Item>
        )
      })}
    </ContextMenu.Content>
  )
}
