'use client'

import React, { useEffect, useState } from 'react'
import { EditorProvider } from '@openweave/react'
import { EditorLayout } from '@/components/layout/EditorLayout'
import { getActiveEditorStoreOrNull } from '@/app/editor/active-store'
import { preloadFonts } from '@/app/editor/fonts'
import { kickSyncEngine } from '@/app/storage/sync'
import { createTab, tabCount } from '@/app/tabs'

export default function Page() {
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    // Mirror EditorView.vue: bootstrap through the tabs store so tab state,
    // the active editor store, and the window.openWeave browser bridge
    // (automation/MCP) are all wired by activateTab — a bare
    // createEditorStore() would leave the bridge dangling.
    if (tabCount() === 0) createTab()
    setIsReady(true)
    // App-level startup that App.vue used to own: load fonts and start the
    // storage sync engine (local persistence / document database).
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
