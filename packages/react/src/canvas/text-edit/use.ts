import { useEffect, useRef, type RefObject } from 'react'

import type { Editor } from '@openweave/core/editor'

import { createTextClipboardActions } from './clipboard'
import { createCaretBlink, createTextCompositionHandlers, createTextEditActions } from './editing'
import { createTextFormattingActions } from './formatting'
import { createTextKeyDownHandler } from './keyboard'
import { focusTextAreaOnCanvasPointerDown, useTextEditingSession } from './textarea'

/**
 * Bridges DOM text input and the editor's canvas text-editing model.
 *
 * This composable manages textarea-backed input, IME composition, caret
 * blinking, keyboard editing behavior, text formatting shortcuts, and syncing
 * text/style-run updates back into the scene graph.
 */
export function useTextEdit(canvasRef: RefObject<HTMLCanvasElement | null>, store: Editor) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const { resetBlink, stopBlink } = createCaretBlink(store)
  const {
    getEditingNode,
    insertText,
    replaceComposedText,
    restoreComposition,
    finishComposition,
    deleteText
  } = createTextEditActions(store)
  const { toggleBold, toggleItalic, toggleUnderline } = createTextFormattingActions(store)

  const { handleCopy, handleCut, handlePaste } = createTextClipboardActions({
    store,
    insertText,
    deleteText,
    resetBlink
  })
  const {
    isComposing,
    onCompositionStart,
    onCompositionUpdate,
    onCompositionEnd,
    onInput,
    resetComposition
  } = createTextCompositionHandlers({
    textareaRef,
    getEditingNode,
    insertText,
    replaceComposedText,
    restoreComposition,
    finishComposition,
    resetBlink
  })

  const onKeyDown = createTextKeyDownHandler({
    store,
    canvasRef,
    getEditingNode,
    isComposing,
    insertText,
    deleteText,
    resetBlink,
    handleCopy,
    handleCut,
    handlePaste,
    toggleBold,
    toggleItalic,
    toggleUnderline
  })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const handler = () => focusTextAreaOnCanvasPointerDown(textareaRef, store)
    canvas.addEventListener('mousedown', handler)
    return () => canvas.removeEventListener('mousedown', handler)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useTextEditingSession({
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
  })
}
