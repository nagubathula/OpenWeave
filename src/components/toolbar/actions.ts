import { useMemo } from 'react'
import {
  ArrowDownToLine,
  ArrowUpToLine,
  Clipboard,
  Copy,
  CopyPlus,
  Group,
  Lock,
  Scissors,
  Trash2,
  Ungroup
} from 'lucide-react'

import type { useEditorCommands } from '@openweave/react'

import type { EditorStore } from '@/app/editor/active-store'
import type { ToolbarActionItem } from '@/components/toolbar/types'

type ToolbarActionOptions = {
  store: EditorStore
  getCommand: ReturnType<typeof useEditorCommands>['getCommand']
  menu: { copy: string; paste: string; cut: string; front: string; back: string; lock: string }
}

export function useToolbarActions({ store, getCommand, menu }: ToolbarActionOptions) {
  const editActions = useMemo<ToolbarActionItem[]>(() => [
    { icon: Copy, label: menu.copy, action: () => void store.mobileCopy() },
    { icon: Clipboard, label: menu.paste, action: () => store.mobilePaste() },
    { icon: Scissors, label: menu.cut, action: () => void store.mobileCut() },
    {
      icon: CopyPlus,
      label: getCommand('selection.duplicate').label,
      action: () => getCommand('selection.duplicate').run()
    },
    {
      icon: Trash2,
      label: getCommand('selection.delete').label,
      action: () => getCommand('selection.delete').run()
    }
  ], [store, menu, getCommand])

  const arrangeActions = useMemo<ToolbarActionItem[]>(() => [
    {
      icon: ArrowUpToLine,
      label: menu.front,
      action: () => getCommand('selection.bringToFront').run()
    },
    {
      icon: ArrowDownToLine,
      label: menu.back,
      action: () => getCommand('selection.sendToBack').run()
    },
    {
      icon: Group,
      label: getCommand('selection.group').label,
      action: () => getCommand('selection.group').run()
    },
    {
      icon: Ungroup,
      label: getCommand('selection.ungroup').label,
      action: () => getCommand('selection.ungroup').run()
    },
    {
      icon: Lock,
      label: menu.lock,
      action: () => getCommand('selection.toggleLock').run()
    }
  ], [menu, getCommand])

  return { editActions, arrangeActions }
}
