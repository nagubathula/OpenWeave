'use client'

import React, { useEffect, useState } from 'react'
import { EditorProvider } from '@openweave/react'
import { EditorLayout } from '@/components/layout/EditorLayout'
import { getActiveEditorStoreOrNull } from '@/app/editor/active-store'
import { preloadFonts } from '@/app/editor/fonts'
import { kickSyncEngine } from '@/app/storage/sync'
import { createTab, activeTab, tabCount } from '@/app/tabs'
import { createDemoShapes } from '@/app/demo/document'

export default function DemoPage() {
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    const createdInitialTab = tabCount() === 0
    const firstTab = createdInitialTab ? createTab() : (activeTab.value ?? createTab())
    
    if (createdInitialTab) {
      void createDemoShapes(firstTab.store)
    }

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
