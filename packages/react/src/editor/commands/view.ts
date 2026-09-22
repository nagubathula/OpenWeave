import type { EditorCommandMapOptions } from './context'
import type { EditorCommand } from './types'

export function createViewCommands({
  editor,
  capabilities,
  messages: t
}: EditorCommandMapOptions): Pick<
  Record<
    'view.zoom100' | 'view.zoomFit' | 'view.zoomSelection' | 'view.commandPalette',
    EditorCommand
  >,
  'view.zoom100' | 'view.zoomFit' | 'view.zoomSelection' | 'view.commandPalette'
> {
  return {
    'view.zoom100': {
      id: 'view.zoom100',
      get label() {
        return t.value.zoomTo100
      },
      enabled: true,
      run: () => editor.zoomTo100()
    },
    'view.zoomFit': {
      id: 'view.zoomFit',
      get label() {
        return t.value.zoomToFit
      },
      enabled: true,
      run: () => editor.zoomToFit()
    },
    'view.zoomSelection': {
      id: 'view.zoomSelection',
      get label() {
        return t.value.zoomToSelection
      },
      enabled: capabilities.canZoomToSelection,
      run: () => editor.zoomToSelection()
    },
    'view.commandPalette': {
      id: 'view.commandPalette',
      get label() {
        return t.value.commandPalette ?? 'Quick actions'
      },
      enabled: true,
      run: () => {
        editor.emitEditorEvent('command-palette:toggle')
      }
    }
  }
}
