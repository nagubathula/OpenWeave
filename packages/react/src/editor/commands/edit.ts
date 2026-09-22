import type { EditorCommandMapOptions } from './context'
import type { EditorCommand } from './types'

type EditCommandId = 'edit.undo' | 'edit.redo' | 'edit.copyProperties' | 'edit.pasteProperties'

// Vector edit mode keeps a session-local history; undo/redo route there
// while it is active instead of the document undo stack.
type NodeEditHistoryEditor = Partial<{
  nodeEditUndo: () => void
  nodeEditRedo: () => void
}>

export function createEditCommands({
  editor,
  capabilities,
  messages: t
}: EditorCommandMapOptions): Record<EditCommandId, EditorCommand> {
  const nodeEditEditor = editor as typeof editor & NodeEditHistoryEditor
  return {
    'edit.undo': {
      id: 'edit.undo',
      get label() {
        return t.value.undo
      },
      enabled: capabilities.canUndo,
      run: () => {
        if (editor.state.nodeEditState) {
          nodeEditEditor.nodeEditUndo?.()
          return
        }
        editor.undoAction()
      }
    },
    'edit.redo': {
      id: 'edit.redo',
      get label() {
        return t.value.redo
      },
      enabled: capabilities.canRedo,
      run: () => {
        if (editor.state.nodeEditState) {
          nodeEditEditor.nodeEditRedo?.()
          return
        }
        editor.redoAction()
      }
    },
    'edit.copyProperties': {
      id: 'edit.copyProperties',
      get label() {
        return t.value.copyProperties ?? 'Copy properties'
      },
      enabled: capabilities.canCopyProperties,
      run: () => {
        editor.copyProperties()
      }
    },
    'edit.pasteProperties': {
      id: 'edit.pasteProperties',
      get label() {
        return t.value.pasteProperties ?? 'Paste properties'
      },
      enabled: capabilities.canPasteProperties,
      run: () => {
        editor.pasteProperties()
      }
    }
  }
}
