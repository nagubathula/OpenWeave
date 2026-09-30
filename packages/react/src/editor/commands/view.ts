import type { EditorCommandMapOptions } from './context'
import type { EditorCommand } from './types'

export function createViewCommands({
  editor,
  capabilities,
  messages: t
}: EditorCommandMapOptions): Pick<
  Record<
    | 'view.zoom100'
    | 'view.zoomFit'
    | 'view.zoomSelection'
    | 'view.zoomRealSize'
    | 'view.zoomRealMobile'
    | 'view.calibrateScale'
    | 'view.insertCreditCard'
    | 'view.commandPalette',
    EditorCommand
  >,
  | 'view.zoom100'
  | 'view.zoomFit'
  | 'view.zoomSelection'
  | 'view.zoomRealSize'
  | 'view.zoomRealMobile'
  | 'view.calibrateScale'
  | 'view.insertCreditCard'
  | 'view.commandPalette'
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
    'view.zoomRealSize': {
      id: 'view.zoomRealSize',
      get label() {
        return t.value.zoomToRealSize
      },
      enabled: true,
      run: () => editor.emitEditorEvent('zoom:real-size')
    },
    'view.zoomRealMobile': {
      id: 'view.zoomRealMobile',
      get label() {
        return t.value.zoomToRealMobile
      },
      enabled: true,
      run: () => editor.emitEditorEvent('zoom:real-mobile')
    },
    'view.calibrateScale': {
      id: 'view.calibrateScale',
      get label() {
        return t.value.calibrateDisplayScale
      },
      enabled: true,
      run: () => editor.emitEditorEvent('scale-dialog:open')
    },
    'view.insertCreditCard': {
      id: 'view.insertCreditCard',
      get label() {
        return t.value.insertCreditCardReference
      },
      enabled: true,
      run: () => editor.emitEditorEvent('scale-reference:insert')
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
