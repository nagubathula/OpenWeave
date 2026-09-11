import { Bot, Sparkles, X } from 'lucide-react'
import React from 'react'

import { useAIChat } from '@/app/ai/chat/use'

interface EmptyStateProps {
  onDismiss?: () => void
}

export default function EmptyState({ onDismiss }: EmptyStateProps) {
  const { activeTab } = useAIChat()

  function handleAskAgent() {
    activeTab.set('ai')
  }

  return (
    <div className="absolute inset-0 flex items-center justify-center p-4 pointer-events-none">
      <div className="relative pointer-events-auto flex flex-col items-center rounded-xl border border-border/70 bg-[#1e1e22]/95 px-6 py-5 shadow-2xl backdrop-blur max-w-sm text-center">
        {onDismiss && (
          <button
            type="button"
            aria-label="Dismiss"
            className="absolute top-3 right-3 flex size-5 cursor-pointer items-center justify-center rounded text-muted hover:bg-hover hover:text-surface"
            onClick={onDismiss}
          >
            <X className="size-3" />
          </button>
        )}

        <div className="mb-2 flex size-8 items-center justify-center rounded-full bg-accent/15 text-accent">
          <Sparkles className="size-4" />
        </div>

        <h4 className="text-xs font-semibold text-white mb-1.5">No animations in timeline</h4>

        <p className="text-[11px] text-muted leading-relaxed mb-4">
          Select objects on the canvas to create an animation, or ask the AI agent to create an idea
          from scratch.
        </p>

        <button
          type="button"
          data-test-id="timeline-ask-agent-button"
          className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-white shadow transition-all hover:bg-accent/90 cursor-pointer"
          onClick={handleAskAgent}
        >
          <Bot className="size-3.5" />
          Ask agent
        </button>
      </div>
    </div>
  )
}
