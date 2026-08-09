'use client'

import React, { useEffect, useState } from 'react'
import { EditorProvider } from '@openweave/react'
import { EditorLayout } from '@/components/layout/EditorLayout'
import { createEditorStore } from '@/app/editor/session'
import { getActiveEditorStoreOrNull, setActiveEditorStore, useEditorStore } from '@/app/editor/active-store'

export default function Page() {
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    let store = getActiveEditorStoreOrNull()
    if (!store) {
      store = createEditorStore()
      setActiveEditorStore(store)
    }
    setIsReady(true)
  }, [])

  if (!isReady) return null

  return (
    <EditorProvider value={getActiveEditorStoreOrNull()!}>
      <EditorLayout />
    </EditorProvider>
  )
}
