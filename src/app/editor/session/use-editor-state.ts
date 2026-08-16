'use client'

import { useCallback, useRef, useSyncExternalStore } from 'react'

import {
  getActiveEditorStoreOrNull,
  onActiveEditorStoreChange
} from '@/app/editor/active-store'
import type { AppEditorState } from '@/app/editor/session/types'

/**
 * Subscribes a React component to fields of the active editor store's state,
 * replacing the old Vue `watch(() => store.state.x)` bridges.
 *
 * The selector runs against the CURRENT active store (it follows tab
 * switches). It must return a primitive or otherwise reference-stable value —
 * returning a fresh object/array every call would loop useSyncExternalStore.
 */
export function useEditorState<T>(selector: (state: AppEditorState) => T, fallback: T): T {
  const latest = useRef({ selector, fallback })
  latest.current = { selector, fallback }

  const subscribe = useCallback((notify: () => void) => {
    let unsubscribeState: (() => void) | undefined
    const bindToActiveStore = () => {
      unsubscribeState?.()
      unsubscribeState = getActiveEditorStoreOrNull()?.subscribeState(() => notify())
    }
    bindToActiveStore()
    const unsubscribeActive = onActiveEditorStoreChange(() => {
      bindToActiveStore()
      notify()
    })
    return () => {
      unsubscribeState?.()
      unsubscribeActive()
    }
  }, [])

  const getSnapshot = useCallback(() => {
    const store = getActiveEditorStoreOrNull()
    return store ? latest.current.selector(store.state) : latest.current.fallback
  }, [])

  const getServerSnapshot = useCallback(() => latest.current.fallback, [])

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
