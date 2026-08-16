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

export interface TextEditingSessionHandlers {
  onInput: (event: Event) => void
  onCompositionStart: (event: CompositionEvent) => void
  onCompositionUpdate: (event: CompositionEvent) => void
  onCompositionEnd: (event: CompositionEvent) => void
  onKeyDown: (event: KeyboardEvent) => void
}

/**
 * The hidden textarea is created imperatively (not JSX-rendered), so its
 * input/composition/keydown listeners must be wired up at the same point it's
 * created — attaching them in a separate mount-only effect would only ever
 * see `textareaRef.current` as null, since the element doesn't exist yet at
 * first render and this effect is the only thing that ever creates one.
 */
export function useTextEditingSession({
  store,
  textareaRef,
  resetBlink,
  stopBlink,
  resetComposition,
  onInput,
  onCompositionStart,
  onCompositionUpdate,
  onCompositionEnd,
  onKeyDown
}: {
  store: Editor
  textareaRef: RefObject<HTMLTextAreaElement | null>
  resetBlink: () => void
  stopBlink: () => void
  resetComposition: () => void
} & TextEditingSessionHandlers) {
  const editingTextId = useSceneComputed(() => store.state.editingTextId)

  useEffect(() => {
    if (!editingTextId) return
    const el = createHiddenTextArea()
    textareaRef.current = el
    el.addEventListener('input', onInput)
    el.addEventListener('compositionstart', onCompositionStart)
    el.addEventListener('compositionupdate', onCompositionUpdate)
    el.addEventListener('compositionend', onCompositionEnd)
    el.addEventListener('keydown', onKeyDown)
    el.focus()
    resetBlink()

    return () => {
      stopBlink()
      el.removeEventListener('input', onInput)
      el.removeEventListener('compositionstart', onCompositionStart)
      el.removeEventListener('compositionupdate', onCompositionUpdate)
      el.removeEventListener('compositionend', onCompositionEnd)
      el.removeEventListener('keydown', onKeyDown)
      el.remove()
      textareaRef.current = null
      resetComposition()
    }
  // Handlers close over stable references (`store`, `textareaRef`) and always
  // read live state, so a fresh closure snapshot taken once per edit-session
  // is equivalent to any other — only `editingTextId` should retrigger this.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingTextId])
}
