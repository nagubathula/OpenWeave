import React from 'react'
import { Panel, Group, Separator } from 'react-resizable-panels'
import EditorCanvas from '@/components/EditorCanvas'
import PagesPanel from '@/components/PagesPanel'
import PropertiesPanel from '@/components/PropertiesPanel'
import Toolbar from '@/components/Toolbar/Toolbar'

export function EditorLayout() {
  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-background text-foreground">
      <Group direction="horizontal" orientation="horizontal">
        <Panel defaultSize={20} minSize={15} maxSize={40} className="bg-panel/50 border-r border-border/50">
          <PagesPanel />
        </Panel>
        
        <Separator className="w-1 bg-border/50 hover:bg-accent hover:w-2 transition-all" />
        
        <Panel minSize={30}>
          <div className="relative flex h-full flex-col">
            <Toolbar />
            <EditorCanvas />
          </div>
        </Panel>
        
        <Separator className="w-1 bg-border/50 hover:bg-accent hover:w-2 transition-all" />
        
        <Panel defaultSize={20} minSize={15} maxSize={40} className="bg-panel/50 border-l border-border/50">
          <PropertiesPanel />
        </Panel>
      </Group>
    </div>
  )
}
