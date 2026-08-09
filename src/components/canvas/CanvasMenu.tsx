import React, { ComponentType } from 'react'
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

const booleanCommandIcons: Partial<Record<EditorCommandId, ComponentType<any>>> = {
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

function contextCommandIcon(id?: EditorCommandId): ComponentType<any> | undefined {
  if (!id) return undefined
  return booleanCommandIcons[id]
}

export default function CanvasMenu() {
  const store = useEditorStore()

  const { editor, selectedIds, hasSelection } = useSelectionState()
  const { getCommand } = useEditorCommands()
  const { canvasMenu } = useMenuModel()
  const { menu: t } = useI18n()

  const canvasMenuActions = createCanvasMenuActions(store, selectedIds)
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
    <ContextMenu.Content className={cls.menu} sideOffset={2} align="start">
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
        onSelect={() => canvasMenuActions.pasteToReplace()}
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
        if (item.separator) {
          return <ContextMenu.Separator key={`menu-${i}`} className={cls.sep} />
        }

        if (item.sub) {
          return (
            <ContextMenu.Sub key={`menu-${i}`}>
              <ContextMenu.SubTrigger data-test-id={item.testId} className={cls.item}>
                <span>{item.label}</span>
                <span className="text-sm text-muted">›</span>
              </ContextMenu.SubTrigger>
              <ContextMenu.Portal>
                <ContextMenu.SubContent className={cls.submenu}>
                  {item.sub.map((sub, j) => {
                    const SubIcon = contextCommandIcon(sub.id)
                    return (
                      <ContextMenu.Item
                        key={j}
                        className={cls.item}
                        data-test-id={sub.separator ? undefined : sub.testId}
                        disabled={sub.separator ? true : sub.disabled}
                        onSelect={(e) => {
                          if (!sub.separator && sub.action) {
                            sub.action()
                          } else {
                            e.preventDefault()
                          }
                        }}
                      >
                        {!sub.separator && (
                          <>
                            <span className="flex min-w-0 flex-1 items-center gap-2">
                              {SubIcon && <SubIcon className="size-3.5 shrink-0 text-muted" />}
                              <span className="truncate">{sub.label}</span>
                            </span>
                            {sub.shortcut && (
                              <AppShortcutText>{sub.shortcut}</AppShortcutText>
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

        const ItemIcon = contextCommandIcon(item.id)
        return (
          <ContextMenu.Item
            key={`menu-${i}`}
            data-test-id={item.testId ?? contextCommandTestId(item.id)}
            className={canvasMenuItemClass(item.label, cls)}
            disabled={item.disabled}
            onSelect={(e) => {
              if (item.action) {
                item.action()
              } else {
                e.preventDefault()
              }
            }}
          >
            <span className="flex min-w-0 flex-1 items-center gap-2">
              {ItemIcon && <ItemIcon className="size-3.5 shrink-0 text-muted" />}
              <span className="truncate">{item.label}</span>
            </span>
            {item.shortcut && (
              <span className={`text-[11px] ${canvasMenuShortcutClass(item.label)}`}>
                {item.shortcut}
              </span>
            )}
          </ContextMenu.Item>
        )
      })}
    </ContextMenu.Content>
  )
}
