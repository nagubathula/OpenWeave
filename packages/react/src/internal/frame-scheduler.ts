import type { Editor } from '@openweave/core/editor'

type FrameCallback = () => void
type EditorFrameScheduler = ReturnType<typeof createEditorFrameScheduler>

const schedulers = new WeakMap<Editor, EditorFrameScheduler>()

function createEditorFrameScheduler() {
  const inputs = new Set<FrameCallback>()
  const renders = new Set<FrameCallback>()
  let frameId: number | null = null
  let flushing = false

  function requestFrame() {
    if (flushing || frameId !== null || (!inputs.size && !renders.size)) return
    frameId = requestAnimationFrame(flush)
  }

  function drain(callbacks: Set<FrameCallback>) {
    for (const callback of Array.from(callbacks)) {
      if (callbacks.delete(callback)) callback()
    }
  }

  function flush() {
    frameId = null
    flushing = true
    try {
      // Apply accumulated input before painting both canvas layers. A render
      // requested by input belongs to this frame, not another rAF later.
      drain(inputs)
      drain(renders)
    } finally {
      flushing = false
      requestFrame()
    }
  }

  function cancel(callbacks: Set<FrameCallback>, callback: FrameCallback) {
    callbacks.delete(callback)
    if (!inputs.size && !renders.size && frameId !== null) {
      cancelAnimationFrame(frameId)
      frameId = null
    }
  }

  return {
    scheduleInput(callback: FrameCallback) {
      inputs.add(callback)
      requestFrame()
    },
    scheduleRender(callback: FrameCallback) {
      renders.add(callback)
      requestFrame()
    },
    cancelInput: (callback: FrameCallback) => cancel(inputs, callback),
    cancelRender: (callback: FrameCallback) => cancel(renders, callback)
  }
}

export function getEditorFrameScheduler(editor: Editor): EditorFrameScheduler {
  const existing = schedulers.get(editor)
  if (existing) return existing
  const scheduler = createEditorFrameScheduler()
  schedulers.set(editor, scheduler)
  return scheduler
}
