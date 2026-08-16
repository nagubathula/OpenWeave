import { useEffect, useMemo, useRef } from 'react'

import type { UndoManager } from '@openweave/scene-graph'

const BATCH_IDLE_MS = 300

type BatchAwareUndoManager = UndoManager & { readonly isBatching: boolean }

interface UndoBatchState {
  batchKey: string | null
  timer: ReturnType<typeof setTimeout> | null
}

export function useUndoBatch(undo: UndoManager) {
  const stateRef = useRef<UndoBatchState>({ batchKey: null, timer: null })

  const api = useMemo(() => {
    const state = stateRef.current

    function commitActiveBatch() {
      if (state.batchKey !== null) {
        undo.commitBatch()
        state.batchKey = null
      }
    }

    function cancelFlush() {
      if (state.timer !== null) {
        clearTimeout(state.timer)
        state.timer = null
      }
    }

    function scheduleFlush() {
      cancelFlush()
      state.timer = setTimeout(() => {
        state.timer = null
        commitActiveBatch()
      }, BATCH_IDLE_MS)
    }

    function flush() {
      cancelFlush()
      commitActiveBatch()
    }

    function ensure(key: string, label: string) {
      if (state.batchKey === null && (undo as BatchAwareUndoManager).isBatching) return
      if (state.batchKey !== key) {
        flush()
        undo.beginBatch(label)
        state.batchKey = key
      }
      scheduleFlush()
    }

    return { ensure, flush }
  }, [undo])

  useEffect(() => () => api.flush(), [api])

  return api
}
