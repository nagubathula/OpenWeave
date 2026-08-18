import { useEffect } from 'react'

import type { EditorEventName, EditorEvents } from '@openweave/core/editor'

import { useEditor } from '../context'

export function useEditorEvent<K extends EditorEventName>(event: K, handler: EditorEvents[K]) {
  const editor = useEditor()

  useEffect(() => {
    const stop = editor.onEditorEvent(event, handler)
    return () => stop()
  }, [editor, event, handler])
}
