import React from 'react'

export default function PagesPanel() {
  return (
    <div className="flex h-full w-full flex-col">
      <div className="flex items-center justify-between border-b border-border px-4 py-2">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Pages</span>
        <button className="text-muted hover:text-foreground">+</button>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        <div className="text-sm text-muted-foreground p-2">
          Page 1
        </div>
      </div>
    </div>
  )
}
