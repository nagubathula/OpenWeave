'use client'

import React, { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { EditorProvider } from '@openweave/react'
import { EditorLayout } from '@/components/layout/EditorLayout'
import { getActiveEditorStoreOrNull } from '@/app/editor/active-store'
import { preloadFonts } from '@/app/editor/fonts'
import { kickSyncEngine } from '@/app/storage/sync'
import { createTab, tabCount } from '@/app/tabs'

export default function SharePage() {
  const params = useParams()
  const roomId = params.roomId as string

  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    // Boilerplate setup mirroring EditorView
    if (tabCount() === 0) createTab()
    
    // Note: The actual Collab connection logic (useCollab) is currently
    // pending porting to React. For now, we capture the roomId from the URL.
    if (roomId) {
      console.info(`[Collab] Connecting to room: ${roomId}... (pending React port)`)
    }

    setIsReady(true)
    preloadFonts()
    void kickSyncEngine()
  }, [roomId])

  const store = getActiveEditorStoreOrNull()
  if (!isReady || !store) return null

  return (
    <EditorProvider value={store}>
      <EditorLayout />
    </EditorProvider>
  )
}
