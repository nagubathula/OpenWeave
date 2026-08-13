'use client'

import React, { useEffect } from 'react'

import Page from '@/app/page'
import { openStorageWorkspace } from '@/components/storage/StorageWorkspace'

/**
 * Direct-visit route for the storage workspace (replaces the Vue router's
 * /storage path). Renders the normal editor shell and opens the workspace
 * overlay on mount; in-app opens keep the URL in sync via history.pushState.
 */
export default function StoragePage() {
  useEffect(() => {
    openStorageWorkspace()
  }, [])

  return <Page />
}
