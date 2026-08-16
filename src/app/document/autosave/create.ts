import type { EditorState } from '@openweave/core/editor'

import { subscribeObservableState } from '@/app/editor/session/observable-state'

type AutosaveState = EditorState & { autosaveEnabled: boolean }

type AutosaveOptions = {
  state: AutosaveState
  getSavedVersion: () => number
  hasWritableSource: () => boolean
  saveCurrentDocument: () => Promise<void>
}

const AUTOSAVE_DEBOUNCE_MS = 3000

export function createAutosave({
  state,
  getSavedVersion,
  hasWritableSource,
  saveCurrentDocument
}: AutosaveOptions) {
  let timer: ReturnType<typeof setTimeout> | null = null

  const unsubscribe = subscribeObservableState(state, (key) => {
    if (key !== 'sceneVersion') return
    if (timer !== null) clearTimeout(timer)
    timer = setTimeout(() => {
      timer = null
      void runAutosave(state.sceneVersion)
    }, AUTOSAVE_DEBOUNCE_MS)
  })

  async function runAutosave(version: number) {
    if (version === getSavedVersion()) return
    if (!state.autosaveEnabled) return
    if (!hasWritableSource()) return
    try {
      await saveCurrentDocument()
    } catch (e) {
      console.warn('Autosave failed:', e)
    }
  }

  function disposeAutosave() {
    if (timer !== null) clearTimeout(timer)
    timer = null
    unsubscribe()
  }

  return { disposeAutosave }
}
