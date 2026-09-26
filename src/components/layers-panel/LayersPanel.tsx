import React, { useState } from 'react'
import { Panel, Group, Separator } from 'react-resizable-panels'

import { useI18n } from '@openweave/react'

import AssetsPanel from '@/components/assets/AssetsPanel'
import LayerTree from '@/components/layer-tree/LayerTree'
import LeftIconRail from '@/components/layers-panel/LeftIconRail'
import PagesPanel from '@/components/pages-panel/PagesPanel'
import AppMenu from '@/components/shell/AppMenu'
import VariablesButton from '@/components/variables/VariablesButton'

export default function LayersPanel() {
  const { panels } = useI18n()
  const [activeTab, setActiveTab] = useState<'file' | 'assets'>('file')

  return (
    <aside
      data-test-id="layers-panel"
      className="flex min-w-0 flex-1 overflow-hidden border-r border-border bg-panel h-full"
      style={{ contain: 'paint layout style' }}
    >
      <LeftIconRail activeTab={activeTab} onSelectTab={setActiveTab} />

      <div className="flex flex-1 min-w-0 flex-col overflow-hidden">
        <AppMenu />

        {activeTab === 'assets' ? (
          <AssetsPanel />
        ) : (
          <Group orientation="vertical" className="flex-1 overflow-hidden">
            <Panel
              defaultSize={30}
              minSize={10}
              maxSize={60}
              className="flex flex-col overflow-hidden"
            >
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
      </div>
    </aside>
  )
}
