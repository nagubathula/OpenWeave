'use client'

import { useStore } from '@nanostores/react'
import React, { useEffect, useState } from 'react'

import { EditorProvider } from '@openweave/react'

import { getActiveEditorStoreOrNull } from '@/app/editor/active-store'
import { preloadFonts } from '@/app/editor/fonts'
import { closeHome } from '@/app/home/store'
import { kickSyncEngine } from '@/app/storage/sync'
import { activeTabId, createTab, tabCount } from '@/app/tabs'
import { EditorLayout } from '@/components/layout/EditorLayout'

/**
 * Collab share entry point.
 *
 * The room id travels in the query string (/share?room=<id>) rather than a
 * dynamic path segment: with `output: 'export'` a `[roomId]` segment would need
 * every room pre-listed in generateStaticParams, so arbitrary share links would
 * 404 on static hosting. A query param keeps one static HTML file serving every
 * room. `getShareUrl` in src/constants.ts generates matching links.
 */
export default function SharePage() {
  const [isReady, setIsReady] = useState(false)
  const currentTabId = useStore(activeTabId)

  useEffect(() => {
    // Boilerplate setup mirroring the root editor page.
    if (tabCount() === 0) createTab()
    closeHome()

    // The actual join flow lives in CollabPanel (mounted by EditorLayout): it
    // reads ?room= from the URL, auto-opens the join prompt, and connects once
    // the user enters a name.
    setIsReady(true)
    preloadFonts()
    void kickSyncEngine()
  }, [])

  const store = getActiveEditorStoreOrNull()
  if (!isReady || !store) return null

  return (
    <EditorProvider key={currentTabId} value={store}>
      <EditorLayout />
    </EditorProvider>
  )
}
