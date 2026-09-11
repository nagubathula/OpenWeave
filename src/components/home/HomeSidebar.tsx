import { useStore } from '@nanostores/react'
import {
  BookOpen,
  Clock,
  Folder,
  HardDrive,
  Search,
  Settings,
  Sparkles,
  Layers
} from 'lucide-react'
import React from 'react'

import { homeSearchQuery, homeSection, type HomeSection } from '@/app/home/store'
import { openSettingsDialog } from '@/app/settings/dialog'

interface HomeSidebarProps {
  recentsCount: number
  onOpenLibraries: () => void
}

export default function HomeSidebar({ recentsCount, onOpenLibraries }: HomeSidebarProps) {
  const currentSection = useStore(homeSection)
  const searchQuery = useStore(homeSearchQuery)

  const navItems: {
    id: HomeSection
    label: string
    icon: React.ComponentType<{ className?: string }>
    badge?: number
  }[] = [
    { id: 'recents', label: 'Recents', icon: Clock, badge: recentsCount },
    { id: 'drafts', label: 'Drafts & Files', icon: Folder },
    { id: 'templates', label: 'Templates', icon: Sparkles }
  ]

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-border/50 bg-panel/30 select-none">
      {/* Workspace Header */}
      <div className="flex h-14 items-center gap-3 border-b border-border/40 px-4">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-sm">
          <Layers className="size-4" />
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-xs font-semibold text-surface">OpenWeave Workspace</span>
          <span className="text-[10px] text-muted">Local · Offline Ready</span>
        </div>
      </div>

      {/* Search Bar */}
      <div className="p-3">
        <div className="relative flex items-center">
          <Search className="absolute left-2.5 size-3.5 text-muted pointer-events-none" />
          <input
            type="text"
            placeholder="Search recents, templates..."
            value={searchQuery}
            onChange={(e) => homeSearchQuery.set(e.target.value)}
            className="w-full rounded-md border border-border/60 bg-input/40 py-1.5 pr-2.5 pl-8 text-xs text-surface placeholder:text-muted/60 outline-none transition-all focus:border-accent focus:bg-input/70"
          />
        </div>
      </div>

      {/* Primary Navigation */}
      <nav className="flex flex-1 flex-col gap-0.5 px-2">
        <div className="px-2.5 py-1 text-[10px] font-medium tracking-wider text-muted uppercase">
          Library
        </div>
        {navItems.map((item) => {
          const Icon = item.icon
          const active = currentSection === item.id
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => homeSection.set(item.id)}
              className={
                'flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ' +
                (active
                  ? 'bg-accent text-accent-fg shadow-sm'
                  : 'text-muted hover:bg-hover hover:text-surface')
              }
            >
              <Icon className="size-4 shrink-0" />
              <span className="flex-1 text-left">{item.label}</span>
              {typeof item.badge === 'number' && item.badge > 0 && (
                <span
                  className={
                    'rounded-full px-1.5 py-0.2 text-[10px] ' +
                    (active ? 'bg-accent-fg/20 text-accent-fg' : 'bg-input/60 text-muted')
                  }
                >
                  {item.badge}
                </span>
              )}
            </button>
          )
        })}

        <div className="mt-4 px-2.5 py-1 text-[10px] font-medium tracking-wider text-muted uppercase">
          Design Assets
        </div>

        {/* Shared Libraries Trigger */}
        <button
          type="button"
          onClick={onOpenLibraries}
          className="flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-muted transition-colors hover:bg-hover hover:text-surface"
        >
          <BookOpen className="size-4 shrink-0" />
          <span className="flex-1 text-left">Shared Libraries</span>
        </button>

        {/* Storage Settings Trigger */}
        <button
          type="button"
          onClick={() => openSettingsDialog('storage')}
          className="flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-muted transition-colors hover:bg-hover hover:text-surface"
        >
          <HardDrive className="size-4 shrink-0" />
          <span className="flex-1 text-left">Storage & S3 Sync</span>
        </button>
      </nav>

      {/* Footer Settings */}
      <div className="border-t border-border/40 p-3">
        <button
          type="button"
          onClick={() => openSettingsDialog()}
          className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-muted transition-colors hover:bg-hover hover:text-surface"
        >
          <Settings className="size-4 shrink-0" />
          <span className="flex-1 text-left">Preferences</span>
        </button>
      </div>
    </aside>
  )
}
