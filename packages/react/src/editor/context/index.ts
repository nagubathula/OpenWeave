import { createContext, useContext } from 'react'

import type { Editor } from '@openweave/core/editor'

/**
 * Context for the current OpenWeave editor instance.
 */
export const EditorContext = createContext<Editor | null>(null)

/**
 * Provider component for the OpenWeave editor instance.
 *
 * Wrap your editor shell with <EditorContext.Provider value={editor}>
 */
export const EditorProvider = EditorContext.Provider

/**
 * Returns the current injected OpenWeave editor.
 *
 * Throws if called outside a subtree where EditorProvider has been rendered.
 */
export function useEditor(): Editor {
  const editor = useContext(EditorContext)
  if (!editor) {
    throw new Error(
      '[openweave] useEditor() called without an injected editor. ' +
        'Wrap your component tree in <EditorContext.Provider value={editor}> first.'
    )
  }
  return editor
}
