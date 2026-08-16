import React from 'react'
import { File as FileIcon, X, Plus } from 'lucide-react'
import { useStore } from '@nanostores/react'

import { allTabs, createTab, switchTab, closeTab } from '@/app/tabs'

/** Multi-document tab strip. Ported from src/components/TabBar.vue. */
export default function TabBar() {
  const openTabs = useStore(allTabs)

  // Match the Vue behaviour: the strip is only shown when more than one tab is open.
  if (openTabs.length <= 1) return null

  const onMiddleClick = (e: React.MouseEvent, tabId: string) => {
    if (e.button === 1) {
      e.preventDefault()
      closeTab(tabId)
    }
  }

  const onClose = (e: React.MouseEvent, tabId: string) => {
    e.stopPropagation()
    closeTab(tabId)
  }

  return (
    <div
      role="tablist"
      data-test-id="tabbar"
      className="scrollbar-none flex h-9 shrink-0 items-end overflow-x-auto border-b border-border bg-canvas"
    >
      <div className="flex h-full items-end">
        {openTabs.map((tab) => {
          const active = tab.isActive
          return (
            <div
              key={tab.id}
              role="tab"
              aria-selected={active}
              data-test-id="tabbar-tab"
              data-active={active || undefined}
              onClick={() => switchTab(tab.id)}
              onMouseDown={(e) => onMiddleClick(e, tab.id)}
              className={
                'group/tab flex h-full max-w-48 min-w-0 cursor-pointer items-center gap-1.5 border-r border-border px-3 text-[11px] transition-colors outline-none select-none ' +
                (active ? 'bg-panel text-surface' : 'text-muted hover:text-surface')
              }
            >
              <FileIcon className="size-3 shrink-0 opacity-50" />
              <span className="min-w-0 flex-1 truncate">{tab.name}</span>
              <button
                type="button"
                data-test-id="tabbar-close"
                data-active={active || undefined}
                aria-label={`Close ${tab.name}`}
                tabIndex={-1}
                onClick={(e) => onClose(e, tab.id)}
                className={
                  'flex size-4 shrink-0 cursor-pointer items-center justify-center rounded transition-opacity group-hover/tab:opacity-100 hover:bg-hover ' +
                  (active ? 'opacity-100' : 'opacity-0')
                }
              >
                <X className="size-3" />
              </button>
            </div>
          )
        })}
      </div>
      <button
        type="button"
        data-test-id="tabbar-new"
        aria-label="New tab"
        onClick={() => createTab()}
        className="flex size-9 shrink-0 cursor-pointer items-center justify-center text-muted transition-colors hover:text-surface"
      >
        <Plus className="size-3.5" />
      </button>
    </div>
  )
}
