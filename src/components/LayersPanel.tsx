import React, { useState } from 'react'
import { Panel, Group, Separator } from 'react-resizable-panels'
import AppMenu from '@/components/shell/AppMenu'
import PagesPanel from '@/components/PagesPanel'
import LayerTree from '@/components/layer-tree/LayerTree'
import AssetsPanel from '@/components/assets/AssetsPanel'
import VariablesButton from '@/components/variables/VariablesButton'
import { useI18n } from '@openweave/react'

export default function LayersPanel() {
  const { menu, panels } = useI18n()
  const [activeTab, setActiveTab] = useState<'file' | 'assets'>('file')

  return (
    <aside
      data-test-id="layers-panel"
      className="flex min-w-0 flex-1 flex-col overflow-hidden border-r border-border bg-panel h-full"
      style={{ contain: 'paint layout style' }}
    >
      <AppMenu />
      <div className="shrink-0 border-b border-border px-2 py-1.5 flex gap-1">
        <button
          type="button"
          data-test-id="left-panel-layers-tab"
          className={`flex-1 rounded py-1 text-center text-xs transition-colors ${
            activeTab === 'file'
              ? 'bg-hover font-semibold text-surface'
              : 'text-muted hover:bg-hover/50 hover:text-surface'
          }`}
          onClick={() => setActiveTab('file')}
        >
          {menu.file}
        </button>
        <button
          type="button"
          data-test-id="left-panel-assets-tab"
          className={`flex-1 rounded py-1 text-center text-xs transition-colors ${
            activeTab === 'assets'
              ? 'bg-hover font-semibold text-surface'
              : 'text-muted hover:bg-hover/50 hover:text-surface'
          }`}
          onClick={() => setActiveTab('assets')}
        >
          {panels.assets}
        </button>
      </div>

      {activeTab === 'assets' ? (
        <AssetsPanel />
      ) : (
        <Group orientation="vertical" className="flex-1 overflow-hidden">
          <Panel defaultSize={30} minSize={10} maxSize={60} className="flex flex-col overflow-hidden">
            <PagesPanel />
          </Panel>

          <Separator className="h-px w-full bg-border hover:h-1 transition-all" />

          <Panel defaultSize={70} minSize={20} className="flex flex-col overflow-hidden">
            <header
              data-test-id="layers-header"
              className="flex shrink-0 items-center justify-between px-3 py-2 text-[11px] font-semibold text-surface"
            >
              {panels.layers}
              <VariablesButton />
            </header>
            <LayerTree />
          </Panel>
        </Group>
      )}
    </aside>
  )
}
