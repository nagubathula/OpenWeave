'use client'

import React, { useEffect, useState } from 'react'

import { EditorProvider } from '@openweave/react'

import { getActiveEditorStoreOrNull } from '@/app/editor/active-store'
import { preloadFonts } from '@/app/editor/fonts'
import { kickSyncEngine } from '@/app/storage/sync'
import { createTab, tabCount } from '@/app/tabs'
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

  useEffect(() => {
    // Boilerplate setup mirroring the root editor page.
    if (tabCount() === 0) createTab()

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
    <EditorProvider value={store}>
      <EditorLayout />
    </EditorProvider>
  )
}
