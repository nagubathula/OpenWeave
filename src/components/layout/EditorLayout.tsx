import React from 'react'
import { Panel, Group, Separator } from 'react-resizable-panels'
import EditorCanvas from '@/components/EditorCanvas'
import LayersPanel from '@/components/LayersPanel'
import PropertiesPanel from '@/components/PropertiesPanel'
import Toolbar from '@/components/Toolbar/Toolbar'

export function EditorLayout() {
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
