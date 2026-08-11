import React, { useEffect } from 'react'
import { Panel, Group, Separator } from 'react-resizable-panels'
import EditorCanvas from '@/components/EditorCanvas'
import LayersPanel from '@/components/LayersPanel'
import PropertiesPanel from '@/components/PropertiesPanel'
import Toolbar from '@/components/Toolbar/Toolbar'
import { getActiveEditorStore } from '@/app/editor/active-store'

function isEditingTarget(el: EventTarget | null): boolean {
  const node = el as HTMLElement | null
  if (!node) return false
  const tag = node.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || node.isContentEditable
}

export function EditorLayout() {
  // Save shortcuts (Cmd/Ctrl+S → save .fig, +Shift → save as). The Vue app's
  // full keyboard registry isn't wired into React yet; this covers file save.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== 's') return
      if (isEditingTarget(e.target)) return
      e.preventDefault()
      const store = getActiveEditorStore()
      if (e.shiftKey) void store.saveFigFileAs()
      else void store.saveFigFile()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-background text-foreground">
      <Group orientation="horizontal" className="flex-1 min-h-0">
        <Panel defaultSize="20" minSize="15" maxSize="40" className="bg-panel/50 border-r border-border/50">
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

        <Panel defaultSize="20" minSize="15" maxSize="40" className="bg-panel/50 border-l border-border/50">
          <PropertiesPanel />
        </Panel>
      </Group>
    </div>
  )
}
