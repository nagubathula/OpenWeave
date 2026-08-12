import { useEffect, useRef } from 'react'

import { useEditorCommands, useViewportKind } from '@openweave/react'

import { useEditorStore } from '@/app/editor/active-store'
import { createKeyboardActions } from '@/app/shell/keyboard/actions'
import { bindEditorClipboard } from '@/app/shell/keyboard/clipboard'
import { isInputElement } from '@/app/shell/keyboard/focus'
import { bindNudgeKeys } from '@/app/shell/keyboard/nudging'
import { registerKeyboardShortcuts } from '@/app/shell/keyboard/registry'
import { openFileDialog } from '@/app/shell/menu/files'
import { activeTab as activeTabRef, closeTab, createTab } from '@/app/tabs'

/**
 * Installs the app's global keyboard shortcuts for the React shell — undo/redo,
 * copy/cut/paste, delete/duplicate, tool shortcuts, save, arrow-key nudging, and
 * space-to-pan. Replaces the Vue `useKeyboard()` composable; the underlying
 * registry now returns cleanups instead of relying on Vue scope disposal.
 *
 * Listeners are registered once, but they route through `latest` so command
 * gating (e.g. `command.enabled`) always reflects the CURRENT selection rather
 * than the mount-time state.
 */
export function useAppKeyboard() {
  const store = useEditorStore()
  const { isMobile } = useViewportKind()
  const commands = useEditorCommands()

  const latest = useRef({ commands, isMobile })
  latest.current = { commands, isMobile }

  useEffect(() => {
    const inputFocused = {
      get value() {
        return isInputElement(document.activeElement)
      }
    }
    const isMobileAdapter = {
      get value() {
        return latest.current.isMobile.value
      }
    }
    // Standalone tab state for the mobile AI-toggle shortcut (mobile-only path).
    const activeTab: { value: 'design' | 'code' | 'ai' } = { value: 'design' }

    // Stable wrappers that always call the latest command map, so `enabled`
    // gates reflect the current selection.
    const runCommand: typeof commands.runCommand = (id) => latest.current.commands.runCommand(id)
    const setOpacityTarget: typeof commands.setOpacityTarget = (value, coalesceKey) =>
      latest.current.commands.setOpacityTarget(value, coalesceKey)

    const actions = createKeyboardActions({
      store,
      activeTab,
      isMobile: isMobileAdapter,
      runCommand,
      setOpacityTarget
    })

    const disposers = [
      bindEditorClipboard(store),
      bindNudgeKeys(store),
      registerKeyboardShortcuts({
        inputFocused,
        store,
        runCommand,
        actions,
        openFileDialog: () => {
          void openFileDialog()
        },
        closeActiveTab: () => {
          if (activeTabRef.value) closeTab(activeTabRef.value.id)
        },
        createTab: () => createTab()
      })
    ]

    return () => {
      for (const dispose of disposers) dispose()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store])
}
