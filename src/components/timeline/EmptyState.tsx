import { Activity, ArrowUp, Bot, Film, Plus, Sparkles, TrendingUp } from 'lucide-react'
import React from 'react'

import { useSelectionState } from '@openweave/react'

import { useAIChat } from '@/app/ai/chat/use'
import { addPropertyTrack, applyMotionPreset, seek } from '@/app/motion/store'
import type { MotionPreset } from '@/app/motion/types'
import { HEADER_WIDTH } from '@/components/timeline/constants'

interface EmptyStateProps {
  onDismiss?: () => void
}

const QUICK_PRESETS: { id: MotionPreset; label: string; icon: React.ReactNode }[] = [
  { id: 'fadeIn', label: 'Fade In', icon: <Sparkles className="size-3 text-amber-400" /> },
  { id: 'slideUp', label: 'Slide Up', icon: <ArrowUp className="size-3 text-blue-400" /> },
  { id: 'scalePop', label: 'Scale Pop', icon: <TrendingUp className="size-3 text-emerald-400" /> },
  { id: 'springBounce', label: 'Bounce', icon: <Activity className="size-3 text-purple-400" /> }
]

export default function EmptyState({ onDismiss }: EmptyStateProps) {
  const { activeTab } = useAIChat()
  const { editor, selectedIds } = useSelectionState()

  const firstSelectedId = [...selectedIds][0]
  const selectedNode = firstSelectedId ? editor.graph.getNode(firstSelectedId) : null

  function handleAskAgent() {
    activeTab.set('ai')
  }

  function handleApplyPreset(preset: MotionPreset) {
    if (!selectedNode) return
    applyMotionPreset(selectedNode.id, preset)
    seek(0)
    onDismiss?.()
  }

  function handleAddDefaultTrack() {
    if (!selectedNode) return
    addPropertyTrack(selectedNode.id, selectedNode.name || 'Layer', 'x')
    seek(0)
    onDismiss?.()
  }

  return (
    <div
      data-test-id="timeline-empty-state"
      className="flex flex-1 min-h-[140px] w-full border-b border-border/40 select-none bg-panel/30"
    >
      {/* Sticky left track column */}
      <div
        className="sticky left-0 z-10 flex flex-col justify-center border-r border-border bg-panel px-3 py-4 shrink-0 shadow-xs"
        style={{ width: `${HEADER_WIDTH}px` }}
      >
        {selectedNode ? (
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1.5">
              <span className="text-accent text-[11px] font-mono">❖</span>
              <span className="font-semibold text-xs text-surface truncate">
                {selectedNode.name || 'Layer'}
              </span>
            </div>
            <span className="text-[10px] text-muted font-medium">Ready to animate</span>
          </div>
        ) : (
          <div className="flex flex-col gap-0.5">
            <span className="font-medium text-xs text-surface/80">No active tracks</span>
            <span className="text-[10px] text-muted">Select a layer on canvas</span>
          </div>
        )}
      </div>

      {/* Right track area: contextual quick-start bar or empty guidance */}
      <div className="flex flex-1 items-center justify-center p-6 bg-canvas/30">
        {selectedNode ? (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-border/80 bg-panel/90 px-6 py-4 shadow-md backdrop-blur">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-surface">
                Ready to animate:{' '}
                <strong className="text-accent">{selectedNode.name || 'Layer'}</strong>
              </span>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-1.5">
              {QUICK_PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleApplyPreset(p.id)}
                  className="flex items-center gap-1.5 rounded-md border border-border bg-panel px-2.5 py-1 text-xs font-medium text-surface/90 hover:bg-hover hover:text-surface hover:border-accent/40 shadow-2xs transition-all cursor-pointer"
                >
                  {p.icon}
                  <span>{p.label}</span>
                </button>
              ))}

              <button
                type="button"
                onClick={handleAddDefaultTrack}
                className="flex items-center gap-1 rounded-md border border-border bg-panel px-2.5 py-1 text-xs font-medium text-muted hover:bg-hover hover:text-surface shadow-2xs transition-all cursor-pointer"
              >
                <Plus className="size-3" />
                <span>Custom track</span>
              </button>

              <div className="h-4 w-px bg-border/80 mx-0.5" />

              <button
                type="button"
                data-test-id="timeline-ask-agent-button"
                onClick={handleAskAgent}
                className="flex items-center gap-1.5 rounded-md bg-accent px-3 py-1 text-xs font-medium text-white shadow-xs transition-all hover:bg-accent/90 cursor-pointer"
              >
                <Bot className="size-3.5" />
                <span>Ask AI Agent</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 text-center max-w-sm">
            <div className="flex size-9 items-center justify-center rounded-full bg-accent/10 text-accent mb-0.5">
              <Film className="size-4" />
            </div>

            <h4 className="text-xs font-semibold text-surface">No animations in timeline</h4>

            <p className="text-[11px] text-muted leading-relaxed">
              Select any shape or frame on the canvas to animate its properties, or ask the AI agent
              to generate motion for your design.
            </p>

            <div className="mt-1 flex items-center gap-2">
              <button
                type="button"
                data-test-id="timeline-ask-agent-button"
                onClick={handleAskAgent}
                className="flex items-center gap-1.5 rounded-lg bg-accent px-3.5 py-1.5 text-xs font-medium text-white shadow-xs transition-all hover:bg-accent/90 cursor-pointer"
              >
                <Bot className="size-3.5" />
                <span>Ask AI to animate</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
