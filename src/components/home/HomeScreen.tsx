import { useStore } from '@nanostores/react'
import { FileUp, FolderOpen, LayoutGrid, List, Plus } from 'lucide-react'
import React, { useState } from 'react'

import { closeHome, homeSection, homeViewMode } from '@/app/home/store'
import { openFileDialog } from '@/app/shell/menu/files'
import { createTab } from '@/app/tabs'
import LibrariesDialog from '@/components/assets/LibrariesDialog'

import HomeSidebar from './HomeSidebar'
import RecentFilesGrid from './RecentFilesGrid'
import TemplatesCarousel from './TemplatesCarousel'

export default function HomeScreen() {
  const currentSection = useStore(homeSection)
  const viewMode = useStore(homeViewMode)
  const [recentsCount, setRecentsCount] = useState(0)
  const [librariesOpen, setLibrariesOpen] = useState(false)

  const handleNewDesignFile = () => {
    createTab()
    closeHome()
  }

  const sectionTitles: Record<string, string> = {
    recents: 'Recents',
    drafts: 'Drafts & Local Files',
    templates: 'Starter Templates',
    storage: 'Storage & Sync'
  }

  const handleOpenFile = async () => {
    await openFileDialog()
    closeHome()
  }

  const handleImport = async () => {
    await openFileDialog()
    closeHome()
  }

  return (
    <div
      data-test-id="home-screen"
      className="flex h-full w-full overflow-hidden bg-background text-foreground select-none"
    >
      {/* Left Sidebar */}
      <HomeSidebar recentsCount={recentsCount} onOpenLibraries={() => setLibrariesOpen(true)} />

      {/* Main Content Dashboard */}
      <main className="flex min-w-0 flex-1 flex-col overflow-y-auto">
        {/* Top Action Bar */}
        <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center justify-between border-b border-border/40 bg-background/80 px-8 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <h1 className="text-base font-semibold text-surface">
              {sectionTitles[currentSection] ?? 'Recents'}
            </h1>
          </div>

          <div className="flex items-center gap-2.5">
            {/* View Mode Toggle */}
            <div className="flex items-center rounded-lg border border-border/60 bg-panel/40 p-0.5">
              <button
                type="button"
                aria-label="Grid view"
                onClick={() => homeViewMode.set('grid')}
                className={
                  'flex size-7 items-center justify-center rounded-md text-xs transition-colors ' +
                  (viewMode === 'grid'
                    ? 'bg-accent text-accent-fg shadow-xs'
                    : 'text-muted hover:text-surface')
                }
              >
                <LayoutGrid className="size-3.5" />
              </button>
              <button
                type="button"
                aria-label="List view"
                onClick={() => homeViewMode.set('list')}
                className={
                  'flex size-7 items-center justify-center rounded-md text-xs transition-colors ' +
                  (viewMode === 'list'
                    ? 'bg-accent text-accent-fg shadow-xs'
                    : 'text-muted hover:text-surface')
                }
              >
                <List className="size-3.5" />
              </button>
            </div>

            {/* Open from disk */}
            <button
              type="button"
              onClick={() => void handleOpenFile()}
              className="flex items-center gap-2 rounded-lg border border-border/60 bg-panel/40 px-3 py-1.5 text-xs font-medium text-surface transition-colors hover:bg-hover hover:border-border"
            >
              <FolderOpen className="size-3.5 text-muted" />
              <span>Open file</span>
            </button>

            {/* Import */}
            <button
              type="button"
              onClick={() => void handleImport()}
              className="flex items-center gap-2 rounded-lg border border-border/60 bg-panel/40 px-3 py-1.5 text-xs font-medium text-surface transition-colors hover:bg-hover hover:border-border"
            >
              <FileUp className="size-3.5 text-muted" />
              <span>Import</span>
            </button>

            {/* New Design File Button */}
            <button
              type="button"
              data-test-id="home-new-file-btn"
              onClick={handleNewDesignFile}
              className="flex items-center gap-1.5 rounded-lg bg-accent px-3.5 py-1.5 text-xs font-semibold text-accent-fg shadow-sm transition-opacity hover:opacity-90 active:scale-98"
            >
              <Plus className="size-3.5" />
              <span>Design file</span>
            </button>
          </div>
        </header>

        {/* Dashboard Body */}
        <div className="flex flex-col gap-8 p-8">
          {/* Templates Banner (shown on recents or templates tabs) */}
          {(currentSection === 'recents' || currentSection === 'templates') && (
            <TemplatesCarousel />
          )}

          {/* Recent / Stored Documents Section */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-border/30 pb-2">
              <h2 className="text-xs font-semibold text-surface">
                {currentSection === 'templates' ? 'All Templates' : 'Recently viewed'}
              </h2>
            </div>

            <RecentFilesGrid onCountChange={setRecentsCount} />
          </div>
        </div>
      </main>

      {/* Shared Libraries Dialog */}
      <LibrariesDialog open={librariesOpen} onClose={() => setLibrariesOpen(false)} />
    </div>
  )
}
