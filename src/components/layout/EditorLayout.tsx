import React, { useEffect, useState } from 'react'
import { Panel, Group, Separator } from 'react-resizable-panels'
import { watch } from 'vue'
import { Sidebar } from 'lucide-react'
import EditorCanvas from '@/components/EditorCanvas'
import LayersPanel from '@/components/LayersPanel'
import PropertiesPanel from '@/components/PropertiesPanel'
import Toolbar from '@/components/toolbar/Toolbar'
import TabBar from '@/components/TabBar'
import SafariBanner from '@/components/SafariBanner'
import RenameSelectionDialog from '@/components/selection/RenameSelectionDialog'
import StorageWorkspace from '@/components/storage/StorageWorkspace'
import CollabPanel from '@/components/collab-panel/CollabPanel'
import MobileDrawer from '@/components/MobileDrawer'
import MobileHud from '@/components/mobile-hud/MobileHud'
import { useViewportKind } from '@openweave/react'
import { getActiveEditorStore } from '@/app/editor/active-store'
import { useAppKeyboard } from '@/app/shell/keyboard/use-app-keyboard'
import { useMenu } from '@/app/shell/menu/use'
import { CollabProvider, useCollab } from '@/app/collab/use'
import { getActiveStore } from '@/app/tabs'

/**
 * Chrome shown top-left when the UI chrome is hidden (`state.showUI = false`),
 * mirroring the collapsed layout in src/views/EditorView.vue: document name plus
 * a button to bring the panels back.
 */
function CollapsedChrome() {
  const [name, setName] = useState('')

  useEffect(() => {
    const stop = watch(
      () => getActiveEditorStore().state.documentName,
      (value) => setName(value ?? ''),
      { immediate: true }
    )
    return stop
  }, [])

  return (
    <div className="absolute top-7 left-7 z-10 flex items-center gap-2 rounded-lg border border-border bg-panel px-2 py-1 shadow-sm">
      <img src="/favicon-32.png" className="size-4" alt="OpenWeave" />
      <span data-test-id="editor-document-name" className="text-xs text-surface">
        {name}
      </span>
      <button
        type="button"
        data-test-id="editor-show-ui"
        title="Show UI"
        aria-label="Show UI"
        className="ml-1 flex size-6 cursor-pointer items-center justify-center rounded text-muted transition-colors hover:bg-hover hover:text-surface"
        onClick={() => {
          getActiveEditorStore().state.showUI = true
        }}
      >
        <Sidebar className="size-3.5" />
      </button>
    </div>
  )
}

export function EditorLayout() {
  // Global keyboard shortcuts: undo/redo, copy/paste, delete, duplicate, tools,
  // save (Cmd+S / Cmd+Shift+S), arrow-nudge, space-to-pan.
  useAppKeyboard()

  // Native (Tauri) application menu — no-ops in the browser.
  useMenu()

  // Collaboration session: created once per shell mount (useCollab is a plain
  // Vue-reactive factory, not a React hook, so lazy useState init is safe) and
  // torn down on unmount — the session's old Vue `tryOnScopeDispose` cleanup
  // no-ops in React, so disconnecting here is what actually closes the room.
  const [collab] = useState(() => useCollab(getActiveStore))
  useEffect(() => {
    return () => collab.disconnect()
  }, [collab])

  // `showUI` (from the editor store) toggles the full panel chrome; `?no-chrome`
  // (from the URL) drops to a bare canvas. Both mirror src/views/EditorView.vue.
  const [showUI, setShowUI] = useState(true)
  const [noChrome, setNoChrome] = useState(false)

  // `useViewportKind().isMobile` is a Vue ref (always truthy when read bare) —
  // bridge it to React state, reactive across the 768px breakpoint.
  const { isMobile: isMobileRef } = useViewportKind()
  const [isMobile, setIsMobile] = useState(isMobileRef.value)
  useEffect(() => {
    const stop = watch(isMobileRef, (value) => setIsMobile(value), { immediate: true })
    return stop
  }, [isMobileRef])

  useEffect(() => {
    setNoChrome(new URLSearchParams(window.location.search).has('no-chrome'))
    const stop = watch(
      () => getActiveEditorStore().state.showUI,
      (value) => setShowUI(value),
      { immediate: true }
    )
    return stop
  }, [])

  // Ported from src/views/EditorView.vue: block the browser's pinch/⌘-scroll zoom
  // so ctrl/meta + wheel drives the canvas zoom instead of the page.
  useEffect(() => {
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) e.preventDefault()
    }
    document.addEventListener('wheel', onWheel, { passive: false })
    return () => document.removeEventListener('wheel', onWheel)
  }, [])

  return (
    <CollabProvider value={collab}>
    <div
      data-test-id="editor-root"
      className="flex h-screen w-screen flex-col overflow-hidden bg-background text-foreground"
    >
      <SafariBanner />
      <RenameSelectionDialog />
      <TabBar />

      {noChrome ? (
        <div className="flex flex-1 overflow-hidden">
          <div className="relative flex min-w-0 flex-1">
            <EditorCanvas />
          </div>
        </div>
      ) : isMobile && showUI ? (
        <div className="flex flex-1 overflow-hidden">
          <div className="relative flex min-w-0 flex-1">
            <EditorCanvas />
            <MobileHud />
            <Toolbar />
          </div>
          <MobileDrawer />
        </div>
      ) : showUI ? (
        <Group orientation="horizontal" className="flex-1 min-h-0">
          <Panel
            defaultSize="20"
            minSize="15"
            maxSize="40"
            className="bg-panel/50 border-r border-border/50"
          >
            <LayersPanel />
          </Panel>

          <Separator className="w-1 bg-border/50 hover:bg-accent hover:w-2 transition-all" />

          <Panel minSize="30">
            <div className="relative flex h-full flex-col">
              <Toolbar />
              <EditorCanvas />
            </div>
          </Panel>

          <Separator className="w-1 bg-border/50 hover:bg-accent hover:w-2 transition-all" />

          <Panel
            defaultSize="20"
            minSize="15"
            maxSize="40"
            className="bg-panel/50 border-l border-border/50"
          >
            <div className="flex h-full flex-col">
              <div className="flex shrink-0 items-center justify-between border-b border-border px-1.5 py-1.5">
                <CollabPanel />
              </div>
              <PropertiesPanel />
            </div>
          </Panel>
        </Group>
      ) : (
        <div className="flex flex-1 overflow-hidden">
          <div className="relative flex min-w-0 flex-1">
            <EditorCanvas />
            <CollapsedChrome />
          </div>
        </div>
      )}

      <StorageWorkspace />
    </div>
    </CollabProvider>
  )
}
