import { useStore } from '@nanostores/react'
import { useMemo, useRef } from 'react'

import { createEditorCommandActions } from './actions'
import { createEditorCommandMap } from './definitions'
import { useEditor } from '#react/editor/context'
import { useSelectionCapabilities } from '#react/editor/selection-capabilities/use'
import { useSelectionState } from '#react/editor/selection-state/use'
import { commandMessages } from '#react/i18n'
import { usePageList } from '#react/primitives/PageList/usePageList'

export type {
  EditorCommand,
  EditorCommandId,
  EditorCommandMenuEntry,
  EditorCommandMenuItem,
  EditorCommandMenuSeparator
} from './types'

/**
 * Builds a command-oriented interface on top of the current editor.
 *
 * Use this hook when building menus, toolbars, keyboard handlers, or
 * any other UI that should talk in terms of commands instead of raw editor
 * method calls.
 */
export function useEditorCommands() {
  const editor = useEditor()
  const selection = useSelectionState()
  const capabilities = useSelectionCapabilities()
  const { pages } = usePageList()

  const tRaw = useStore(commandMessages)
  // The command files (edit/selection/view) were written against a Vue-ref
  // shape { value: Record<string,string> }. Wrap the nanostores value to match.
  const t = useMemo(() => ({ value: tRaw }), [tRaw])

  const otherPagesArray = useMemo(() =>
    pages.filter((page) => page.id !== editor.state.currentPageId),
    [pages, editor.state.currentPageId]
  )
  // Context types otherPages as ComputedRef; wrap as a ref-like object.
  const otherPages = useMemo(() => ({ value: otherPagesArray }), [otherPagesArray])

  function moveSelectionToPage(pageId: string) {
    if (!capabilities.canMoveToPage) return
    editor.moveToPage(pageId)
  }

  const opacityTarget = useRef<{ value: number; coalesceKey?: string }>({ value: 1 })
  function setOpacityTarget(value: number, coalesceKey?: string) {
    opacityTarget.current = coalesceKey ? { value, coalesceKey } : { value }
  }

  const commands = useMemo(() => createEditorCommandMap({
    editor,
    selection,
    capabilities,
    messages: t,
    otherPages: otherPages as any,
    moveSelectionToPage,
    getOpacityTarget: () => opacityTarget.current
  }), [editor, selection, capabilities, t, otherPages, opacityTarget])

  const actions = useMemo(() => createEditorCommandActions(commands), [commands])

  return {
    commands,
    otherPages,
    moveSelectionToPage,
    setOpacityTarget,
    ...actions
  }
}
