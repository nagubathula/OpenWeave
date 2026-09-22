import { useStore } from '@nanostores/react'
import { Code2 } from 'lucide-react'
import React from 'react'

import { useAIChat } from '@/app/ai/chat/use'
import { getActiveEditorStore } from '@/app/editor/active-store'

export default function DevModeToggle() {
  const { activeTab: activeTabAtom } = useAIChat()
  const activeTab = useStore(activeTabAtom)
  const isDev = activeTab === 'dev'

  const toggle = () => {
    const next = isDev ? 'design' : 'dev'
    activeTabAtom.set(next)
    const store = getActiveEditorStore()
    store.state.devMode = !isDev
    store.requestRepaint()
  }

  return (
    <button
      type="button"
      data-test-id="dev-mode-toggle"
      aria-label="Dev Mode (Shift+D)"
      aria-pressed={isDev}
      onClick={toggle}
      className={
        'flex h-7 items-center gap-1.5 rounded-md border px-2 text-xs font-medium transition-all ' +
        (isDev
          ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-400 shadow-sm'
          : 'border-border/60 bg-panel text-muted hover:border-border hover:text-surface')
      }
    >
      <Code2 className="size-3.5" />
      <span>Dev Mode</span>
      <kbd className="ml-0.5 rounded bg-muted/20 px-1 py-0.2 text-[10px] font-mono text-muted">
        ⇧D
      </kbd>
    </button>
  )
}
