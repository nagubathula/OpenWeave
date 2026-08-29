import { useStore } from '@nanostores/react'
import * as Tabs from '@radix-ui/react-tabs'
import { Code, Sparkles } from 'lucide-react'
import React, { useEffect } from 'react'

import { useAIChat, type PropertiesTab } from '@/app/ai/chat/use'
import { useEditorStore } from '@/app/editor/active-store'
import ChatPanel from '@/components/chat/ChatPanel'
import ZoomDropdown from '@/components/editor/ZoomDropdown'
import CodePanel from '@/components/properties/CodePanel'
import DesignPanel from '@/components/properties/DesignPanel'
import PrototypePanel from '@/components/prototype/PrototypePanel'

export default function PropertiesPanel() {
  // The tab selection is shared app state (a nanostores atom in @/app/ai/chat/use)
  // so the ⌘J shortcut can toggle the AI tab.
  const { activeTab: activeTabAtom } = useAIChat()
  const activeTab = useStore(activeTabAtom)
  const setActiveTab = (value: string) => {
    activeTabAtom.set(value as PropertiesTab)
  }

  // Prototype connection arrows on the canvas follow the tab.
  const store = useEditorStore()
  useEffect(() => {
    store.state.prototypeMode = activeTab === 'prototype'
    store.requestRepaint()
    return () => {
      store.state.prototypeMode = false
      store.requestRepaint()
    }
  }, [store, activeTab])

  return (
    <aside
      data-test-id="properties-panel"
      className="flex min-w-0 flex-1 flex-col overflow-hidden border-l border-border bg-panel w-full"
      style={{ contain: 'paint layout style' }}
    >
      <Tabs.Root
        value={activeTab}
        onValueChange={setActiveTab}
        className="flex min-h-0 flex-1 flex-col"
      >
        <Tabs.List className="flex h-10 shrink-0 items-center gap-1 border-b border-border px-2">
          <Tabs.Trigger
            value="design"
            data-test-id="properties-tab-design"
            className="relative rounded px-2.5 py-1 text-[11px] text-muted hover:text-surface data-[state=active]:font-semibold data-[state=active]:text-surface after:absolute after:inset-x-2 after:-bottom-[9px] after:h-0.5 after:rounded-full after:bg-transparent data-[state=active]:after:bg-accent"
          >
            Design
          </Tabs.Trigger>
          <Tabs.Trigger
            value="prototype"
            data-test-id="properties-tab-prototype"
            className="relative rounded px-2.5 py-1 text-[11px] text-muted hover:text-surface data-[state=active]:font-semibold data-[state=active]:text-surface after:absolute after:inset-x-2 after:-bottom-[9px] after:h-0.5 after:rounded-full after:bg-transparent data-[state=active]:after:bg-accent"
          >
            Prototype
          </Tabs.Trigger>
          <Tabs.Trigger
            value="code"
            data-test-id="properties-tab-code"
            className="relative flex items-center gap-1 rounded px-2.5 py-1 text-[11px] text-muted hover:text-surface data-[state=active]:font-semibold data-[state=active]:text-surface after:absolute after:inset-x-2 after:-bottom-[9px] after:h-0.5 after:rounded-full after:bg-transparent data-[state=active]:after:bg-accent"
          >
            <Code className="size-3" />
            Code
          </Tabs.Trigger>
          <Tabs.Trigger
            value="ai"
            data-test-id="properties-tab-ai"
            className="relative flex items-center gap-1 rounded px-2.5 py-1 text-[11px] text-muted hover:text-surface data-[state=active]:font-semibold data-[state=active]:text-surface after:absolute after:inset-x-2 after:-bottom-[9px] after:h-0.5 after:rounded-full after:bg-transparent data-[state=active]:after:bg-accent"
          >
            <Sparkles className="size-3" />
            AI
          </Tabs.Trigger>

          {activeTab === 'design' && (
            <div className="ml-auto pr-2">
              <ZoomDropdown />
            </div>
          )}
        </Tabs.List>

        <Tabs.Content value="design" className="flex min-h-0 flex-1 flex-col">
          <DesignPanel />
        </Tabs.Content>

        <Tabs.Content value="prototype" className="flex min-h-0 flex-1 flex-col">
          <PrototypePanel />
        </Tabs.Content>

        <Tabs.Content value="code" className="flex min-h-0 flex-1 flex-col">
          <CodePanel />
        </Tabs.Content>

        {/* forceMount so in-progress chat state survives tab switches. */}
        <Tabs.Content
          value="ai"
          forceMount
          className="flex min-h-0 flex-1 flex-col data-[state=inactive]:hidden"
        >
          <ChatPanel />
        </Tabs.Content>
      </Tabs.Root>
    </aside>
  )
}
