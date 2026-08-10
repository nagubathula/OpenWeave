import React, { useState, useRef, useEffect } from 'react'
import { Settings, PanelLeft } from 'lucide-react'
import { useEditorStore } from '@/app/editor/active-store'

export default function AppMenu() {
  const store = useEditorStore()
  const [isEditing, setIsEditing] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  const commitRename = (name: string) => {
    const trimmed = name.trim()
    if (trimmed) {
      store.state.documentName = trimmed
    }
    setIsEditing(false)
  }

  return (
    <div className="shrink-0 border-b border-border">
      <div className="flex items-center gap-2 px-2 py-1.5">
        <img data-test-id="app-logo" src="/favicon-32.png" className="size-4" alt="OpenWeave" />
        {isEditing ? (
          <input
            ref={inputRef}
            data-test-id="app-document-name-input"
            className="min-w-0 flex-1 rounded border border-accent bg-input px-1 py-0.5 text-xs text-surface outline-none"
            defaultValue={store.state.documentName}
            onBlur={(e) => commitRename(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                commitRename(e.currentTarget.value)
              } else if (e.key === 'Escape') {
                setIsEditing(false)
              }
            }}
          />
        ) : (
          <span
            data-test-id="app-document-name"
            className="min-w-0 flex-1 cursor-default truncate rounded px-1 py-0.5 text-xs text-surface hover:bg-hover"
            onDoubleClick={() => setIsEditing(true)}
          >
            {store.state.documentName || 'Untitled'}
          </span>
        )}
        <button
          type="button"
          data-test-id="app-settings-trigger"
          title="Settings"
          className="flex size-6 shrink-0 cursor-pointer items-center justify-center rounded text-muted transition-colors hover:bg-hover hover:text-surface"
        >
          <Settings className="size-3.5" />
        </button>
        <button
          type="button"
          data-test-id="app-toggle-ui"
          title="Toggle UI"
          className="flex size-6 shrink-0 cursor-pointer items-center justify-center rounded text-muted transition-colors hover:bg-hover hover:text-surface"
          onClick={() => {
            store.state.showUI = !store.state.showUI
          }}
        >
          <PanelLeft className="size-3.5" />
        </button>
      </div>
    </div>
  )
}
