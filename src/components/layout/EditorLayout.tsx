import { Sidebar } from 'lucide-react'
import React, { useEffect, useState, useRef, useCallback } from 'react'
import { Panel, Group, Separator } from 'react-resizable-panels'
import { useEventListener } from 'usehooks-ts'

import { useViewportKind } from '@openweave/react'

import { connectAutomation } from '@/app/automation/bridge/server'
import { spawnMCPIfNeeded } from '@/app/automation/mcp/spawn'
import { CollabProvider, useCollab } from '@/app/collab/use'
import { getActiveEditorStore } from '@/app/editor/active-store'
import { useEditorState } from '@/app/editor/session/use-editor-state'
import { useAppKeyboard } from '@/app/shell/keyboard/use-app-keyboard'
import { loadEditorLayout, saveEditorLayout } from '@/app/shell/layout-storage'
import { openFileFromPath } from '@/app/shell/menu/files'
import { useMenu } from '@/app/shell/menu/use'
import { getActiveStore } from '@/app/tabs'
import { isTauri } from '@/app/tauri/env'
import AcpPermissionDialog from '@/components/chat/AcpPermissionDialog'
import CollabPanel from '@/components/collab-panel/CollabPanel'
import EditorCanvas from '@/components/editor-canvas/EditorCanvas'
import LayersPanel from '@/components/layers-panel/LayersPanel'
import MobileDrawer from '@/components/mobile-drawer/MobileDrawer'
import MobileHud from '@/components/mobile-hud/MobileHud'
import PropertiesPanel from '@/components/properties-panel/PropertiesPanel'
import SafariBanner from '@/components/safari-banner/SafariBanner'
import RenameSelectionDialog from '@/components/selection/RenameSelectionDialog'
import AppToast from '@/components/shell/AppToast'
import StorageWorkspace from '@/components/storage/StorageWorkspace'
import TabBar from '@/components/tab-bar/TabBar'
import Toolbar from '@/components/toolbar/Toolbar'
import Tip from '@/components/ui/Tip'

/**
 * Chrome shown top-left when the UI chrome is hidden (`state.showUI = false`),
 * mirroring the collapsed layout in src/views/EditorView.vue: document name plus
 * a button to bring the panels back.
 */
function CollapsedChrome() {
  const name = useEditorState((s) => s.documentName ?? '', '')

  return (
    <div className="absolute top-7 left-7 z-10 flex items-center gap-2 rounded-lg border border-border bg-panel px-2 py-1 shadow-sm">
      <img src="/favicon-32.png" className="size-4" alt="OpenWeave" />
      <span data-test-id="editor-document-name" className="text-xs text-surface">
        {name}
      </span>
      {/* oxlint-disable-next-line openweave/no-hardcoded-tip-labels */}`n{' '}
      <Tip label="Show UI">
        <button
          type="button"
          data-test-id="editor-show-ui"
          aria-label="Show UI"
          className="ml-1 flex size-6 cursor-pointer items-center justify-center rounded text-muted transition-colors hover:bg-hover hover:text-surface"
          onClick={() => {
            getActiveEditorStore().state.showUI = true
          }}
        >
          <Sidebar className="size-3.5" />
        </button>
      </Tip>
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
  const showUI = useEditorState((s) => s.showUI, true)
  const [noChrome, setNoChrome] = useState(false)

  const { isMobile } = useViewportKind()

  useEffect(() => {
    setNoChrome(new URLSearchParams(window.location.search).has('no-chrome'))
  }, [])

  // Ported from src/views/EditorView.vue: block the browser's pinch/⌘-scroll zoom
  // so ctrl/meta + wheel drives the canvas zoom instead of the page.
  const onWheel = useCallback((e: WheelEvent) => {
    if (e.ctrlKey || e.metaKey) e.preventDefault()
  }, [])
  const docRef = useRef<Document>(
    typeof document !== 'undefined' ? document : (null as unknown as Document)
  )
  useEventListener('wheel', onWheel, docRef, { passive: false })

  // Ported from src/views/EditorView.vue onMounted: spawn the MCP sidecar,
  // connect the automation bridge (dev + Tauri), and handle OS "Open With"
  // file associations (Tauri).
  useEffect(() => {
    let disposed = false
    let mcpCleanup: (() => void) | null = null
    let automationCleanup: (() => void) | null = null
    let fileAssociationCleanup: (() => void) | null = null

    async function openPendingAssociatedFiles() {
      const { invoke } = await import('@tauri-apps/api/core')
      const files = await invoke<{ path: string }[]>('take_pending_open')
      for (const file of files) {
        await openFileFromPath(file.path)
      }
    }

    void (async () => {
      try {
        const mcp = await spawnMCPIfNeeded()
        if (disposed) {
          mcp?.disconnect()
          return
        }
        mcpCleanup = mcp?.disconnect ?? null
        if (mcp) {
          automationCleanup = connectAutomation(getActiveStore, mcp.authToken).disconnect
        }
      } catch (e) {
        console.warn('[MCP]', e)
      }

      try {
        if (!isTauri()) return
        const { listen } = await import('@tauri-apps/api/event')
        const unlisten = await listen('open-associated-files', () => {
          void openPendingAssociatedFiles().catch((e) => console.error('[Open With]', e))
        })
        if (disposed) {
          unlisten()
          return
        }
        fileAssociationCleanup = unlisten
        await openPendingAssociatedFiles()
      } catch (e) {
        console.error('[Open With]', e)
      }
    })()

    return () => {
      disposed = true
      mcpCleanup?.()
      automationCleanup?.()
      fileAssociationCleanup?.()
    }
  }, [])

  return (
    <CollabProvider value={collab}>
      <div
        data-test-id="editor-root"
        className="flex h-screen w-screen flex-col overflow-hidden bg-background text-foreground"
      >
        <SafariBanner />
        <RenameSelectionDialog />
        <AcpPermissionDialog />
        <AppToast />
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
          <Group
            orientation="horizontal"
            className="flex-1 min-h-0"
            defaultLayout={(() => {
              const [layers, canvas, properties] = loadEditorLayout()
              return { layers, canvas, properties }
            })()}
            onLayoutChanged={(layout) => {
              const sizes = [layout.layers, layout.canvas, layout.properties]
              if (sizes.every((size) => typeof size === 'number')) saveEditorLayout(sizes)
            }}
          >
            <Panel
              id="layers"
              defaultSize="20%"
              minSize="15%"
              maxSize="40%"
              className="bg-panel/50 border-r border-border/50"
            >
              <LayersPanel />
            </Panel>

            <Separator
              data-test-id="left-splitter-handle"
              className="w-1 bg-border/50 hover:bg-accent hover:w-2 transition-all"
            />

            <Panel id="canvas" minSize="30%">
              <div className="relative flex h-full flex-col">
                <Toolbar />
                <EditorCanvas />
              </div>
            </Panel>

            <Separator
              data-test-id="right-splitter-handle"
              className="w-1 bg-border/50 hover:bg-accent hover:w-2 transition-all"
            />

            <Panel
              id="properties"
              defaultSize="20%"
              minSize="15%"
              maxSize="40%"
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
