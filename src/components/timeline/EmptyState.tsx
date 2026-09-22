import { Bot, Play, Sparkles, X } from 'lucide-react'
import React from 'react'

import { useAIChat } from '@/app/ai/chat/use'
import { getActiveEditorStoreOrNull } from '@/app/editor/active-store'
import { addKeyframe, seek } from '@/app/motion/store'

interface EmptyStateProps {
  onDismiss?: () => void
}

export default function EmptyState({ onDismiss }: EmptyStateProps) {
  const { activeTab } = useAIChat()
  const store = getActiveEditorStoreOrNull()
  const selectedNode = store?.selectedNode

  function handleAskAgent() {
    activeTab.set('ai')
  }

  function handleAnimateSelected() {
    if (!selectedNode) return

    // Top-level frames are artboards (canvas) — not directly animatable
    const store = getActiveEditorStoreOrNull()
    if (selectedNode.type === 'FRAME' && selectedNode.parentId && store) {
      const parent = store.graph.getNode(selectedNode.parentId)
      if (parent && parent.type === 'CANVAS') {
        // Silently ignore — user should select a layer inside the frame
        return
      }
    }

    const nodeName = selectedNode.name || 'Layer'
    const currentX = selectedNode.x ?? 0
    const currentY = selectedNode.y ?? 0

    // Seed default motion track (0ms -> 1000ms)
    addKeyframe(selectedNode.id, nodeName, 'x', Math.round(currentX), 0)
    addKeyframe(selectedNode.id, nodeName, 'x', Math.round(currentX + 120), 1000)
    addKeyframe(selectedNode.id, nodeName, 'y', Math.round(currentY), 0)

    seek(0)
    onDismiss?.()
  }

  return (
    <div className="absolute inset-0 flex items-center justify-center p-4 pointer-events-none">
      <div className="relative pointer-events-auto flex flex-col items-center rounded-xl border border-border bg-panel/95 px-6 py-5 shadow-2xl backdrop-blur max-w-sm text-center">
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

        <h4 className="text-xs font-semibold text-surface mb-1.5">No animations in timeline</h4>

        <p className="text-[11px] text-muted leading-relaxed mb-4">
          Select objects on the canvas to animate them, or ask the AI agent to generate motion.
        </p>

        <div className="flex items-center gap-2">
          {selectedNode && (
            <button
              type="button"
              className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-white shadow transition-all hover:bg-accent/90 cursor-pointer"
              onClick={handleAnimateSelected}
            >
              <Play className="size-3 fill-current" />
              <span>Animate {selectedNode.name || 'Layer'}</span>
            </button>
          )}

          <button
            type="button"
            data-test-id="timeline-ask-agent-button"
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium shadow transition-all cursor-pointer ${
              selectedNode
                ? 'border border-border bg-panel text-muted hover:bg-hover hover:text-surface'
                : 'bg-accent text-white hover:bg-accent/90'
            }`}
            onClick={handleAskAgent}
          >
            <Bot className="size-3.5" />
            <span>Ask agent</span>
          </button>
        </div>
      </div>
    </div>
  )
}
