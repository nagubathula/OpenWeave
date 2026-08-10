import { useEffect, type RefObject } from 'react'

import type { Editor } from '@openweave/core/editor'

import { useSceneComputed } from '#react/internal/scene-computed/use'

export function createHiddenTextArea() {
  const textarea = document.createElement('textarea')
  textarea.setAttribute('aria-hidden', 'true')
  textarea.tabIndex = -1
  textarea.className = 'fixed left-0 top-0 h-px w-px opacity-0'
  document.body.appendChild(textarea)
  return textarea
}

export function focusTextAreaOnCanvasPointerDown(
  textareaRef: RefObject<HTMLTextAreaElement | null>,
  store: Editor
) {
  if (store.state.editingTextId && textareaRef.current) {
    requestAnimationFrame(() => textareaRef.current?.focus())
  }
}

export function useTextEditingSession({
  store,
  textareaRef,
  resetBlink,
  stopBlink,
  resetComposition
}: {
  store: Editor
  textareaRef: RefObject<HTMLTextAreaElement | null>
  resetBlink: () => void
  stopBlink: () => void
  resetComposition: () => void
}) {
  const editingTextId = useSceneComputed(() => store.state.editingTextId)

  useEffect(() => {
    if (!editingTextId) return
    const el = createHiddenTextArea()
    textareaRef.current = el
    el.focus()
    resetBlink()

    return () => {
      stopBlink()
      el.remove()
      textareaRef.current = null
      resetComposition()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingTextId])
}
