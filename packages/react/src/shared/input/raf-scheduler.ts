import { getEditorFrameScheduler } from '#react/internal/frame-scheduler'

import type { Editor } from '@openweave/core/editor'

export function createRafScheduler(editor: Editor, flush: () => void) {
  const scheduler = getEditorFrameScheduler(editor)
  return {
    schedule: () => scheduler.scheduleInput(flush),
    cancel: () => scheduler.cancelInput(flush)
  }
}
