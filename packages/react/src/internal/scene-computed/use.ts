import { useSyncExternalStore, useCallback, useRef } from 'react'

import { useEditor } from '../../editor/context'

/**
 * Convenience wrapper for scene-derived computed state in React.
 *
 * It subscribes to render requests which encompassing scene and selection changes.
 *
 * Critical: `getSnapshot` must return the *same reference* when data hasn't
 * changed, otherwise useSyncExternalStore detects a change every call and
 * infinite-loops. We cache the last result and only swap it when the
 * serialized value actually differs.
 */
export function useSceneComputed<T>(fn: () => T): T {
  const editor = useEditor()

  // Keep the latest fn in a ref so getSnapshot is stable.
  const fnRef = useRef(fn)
  fnRef.current = fn

  // Cache the last snapshot value so we return the same reference when unchanged.
  const cachedRef = useRef<{ value: T; serial: string } | null>(null)

  const subscribe = useCallback((callback: () => void) => {
    const unsubscribe1 = editor.onEditorEvent('render:requested', callback)
    const unsubscribe2 = editor.onEditorEvent('selection:changed', callback)
    const unsubscribe3 = editor.onEditorEvent('page:changed', callback)
    return () => {
      unsubscribe1()
      unsubscribe2()
      unsubscribe3()
    }
  }, [editor])

  // Stable reference — computes fn() but returns the previous value if
  // the serialized result hasn't changed, avoiding referential churn.
  const getSnapshot = useCallback((): T => {
    const next = fnRef.current()
    try {
      const serial = JSON.stringify(next)
      if (cachedRef.current && cachedRef.current.serial === serial) {
        return cachedRef.current.value
      }
      cachedRef.current = { value: next, serial }
    } catch {
      // Non-serializable value (e.g. complex objects): always update.
      cachedRef.current = { value: next, serial: '' }
    }
    return next
  }, [])

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}
