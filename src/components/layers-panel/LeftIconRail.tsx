/* eslint-disable openweave/no-hardcoded-tip-labels */
import { useStore } from '@nanostores/react'
import {
  Boxes,
  Layers,
  Settings,
  Sparkles,
  Variable as VariableIcon,
  SlidersHorizontal
} from 'lucide-react'
import React, { useState } from 'react'

import { useAIChat } from '@/app/ai/chat/use'
import { openHome } from '@/app/home/store'
import { openSettingsDialog } from '@/app/settings/dialog'
import Tip from '@/components/ui/Tip'
import { VariablesDialog } from '@/components/variables/VariablesDialog'

interface LeftIconRailProps {
  activeTab: 'file' | 'assets'
  onSelectTab: (tab: 'file' | 'assets') => void
}

export default function LeftIconRail({ activeTab, onSelectTab }: LeftIconRailProps) {
  const { activeTab: aiActiveTabAtom } = useAIChat()
  const aiActiveTab = useStore(aiActiveTabAtom)
  const [variablesOpen, setVariablesOpen] = useState(false)

  const isAIActive = aiActiveTab === 'ai'

  return (
    <div
      data-test-id="left-icon-rail"
      className="flex w-10 shrink-0 flex-col items-center justify-between border-r border-border/60 bg-[#1e1e1e] py-2 select-none"
    >
      <div className="flex flex-col items-center gap-1.5">
        {/* Top Logo / Home Button */}
        <Tip label="Back to files (Home)" side="right">
          <button
            type="button"
            data-test-id="left-rail-logo"
            aria-label="Home"
            className="flex size-7 cursor-pointer items-center justify-center rounded-lg transition-transform hover:scale-105 active:scale-95"
            onClick={() => openHome()}
          >
            <img src="/favicon-32.png" className="size-4" alt="OpenWeave" />
          </button>
        </Tip>

        <div className="my-1 h-px w-5 bg-border/50" />

        {/* Layers / File Tree */}
        <Tip label="Layers & Pages" side="right">
          <button
            type="button"
            data-test-id="left-rail-layers"
            aria-label="Layers & Pages"
            className={`flex size-7 cursor-pointer items-center justify-center rounded-lg transition-all ${
              activeTab === 'file' && !isAIActive
                ? 'bg-hover text-surface shadow-xs font-semibold'
                : 'text-muted hover:bg-hover/60 hover:text-surface'
            }`}
            onClick={() => {
              if (isAIActive) {
                aiActiveTabAtom.set('design')
              }
              onSelectTab('file')
            }}
          >
            <Layers className="size-3.5" />
          </button>
        </Tip>

        {/* AI Assistant / Agents */}
        <Tip label="AI Assistant" side="right">
          <button
            type="button"
            data-test-id="left-rail-ai"
            aria-label="AI Assistant"
            className={`flex size-7 cursor-pointer items-center justify-center rounded-lg transition-all ${
              isAIActive
                ? 'bg-accent text-white shadow-xs font-semibold'
                : 'text-muted hover:bg-hover/60 hover:text-surface'
            }`}
            onClick={() => {
              if (isAIActive) {
                aiActiveTabAtom.set('design')
              } else {
                aiActiveTabAtom.set('ai')
              }
            }}
          >
            <Sparkles className="size-3.5" />
          </button>
        </Tip>

        {/* Assets Panel */}
        <Tip label="Components & Assets" side="right">
          <button
            type="button"
            data-test-id="left-rail-assets"
            aria-label="Assets"
            className={`flex size-7 cursor-pointer items-center justify-center rounded-lg transition-all ${
              activeTab === 'assets' && !isAIActive
                ? 'bg-hover text-surface shadow-xs font-semibold'
                : 'text-muted hover:bg-hover/60 hover:text-surface'
            }`}
            onClick={() => {
              if (isAIActive) {
                aiActiveTabAtom.set('design')
              }
              onSelectTab('assets')
            }}
          >
            <Boxes className="size-3.5" />
          </button>
        </Tip>

        {/* Quick Tools */}
        <Tip label="Tools" side="right">
          <button
            type="button"
            data-test-id="left-rail-tools"
            aria-label="Tools"
            className="flex size-7 cursor-pointer items-center justify-center rounded-lg text-muted transition-all hover:bg-hover/60 hover:text-surface"
            onClick={() => {
              window.dispatchEvent(
                new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true })
              )
            }}
          >
            <SlidersHorizontal className="size-3.5" />
          </button>
        </Tip>

        {/* Local Variables */}
        <Tip label="Local Variables" side="right">
          <button
            type="button"
            data-test-id="left-rail-variables"
            aria-label="Local Variables"
            className="flex size-7 cursor-pointer items-center justify-center rounded-lg text-muted transition-all hover:bg-hover/60 hover:text-surface"
            onClick={() => setVariablesOpen(true)}
          >
            <VariableIcon className="size-3.5" />
          </button>
        </Tip>
      </div>

      {/* Bottom Settings */}
      <div className="flex flex-col items-center gap-1.5">
        <Tip label="Settings" side="right">
          <button
            type="button"
            data-test-id="left-rail-settings"
            aria-label="Settings"
            className="flex size-7 cursor-pointer items-center justify-center rounded-lg text-muted transition-all hover:bg-hover/60 hover:text-surface"
            onClick={() => openSettingsDialog()}
          >
            <Settings className="size-3.5" />
          </button>
        </Tip>
      </div>

      <VariablesDialog open={variablesOpen} onClose={() => setVariablesOpen(false)} />
    </div>
  )
}
