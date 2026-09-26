import type { EditorStore } from '@/app/editor/active-store'
import { pasteClipboardToReplace } from '@/app/editor/clipboard/paste-to-replace'
import { executeClipboardCommand } from '@/app/editor/clipboard/system'
import { requestRenameSelection } from '@/app/editor/selection/rename-dialog'

export function createSelectionMenuActions(store: EditorStore) {
  return {
    copy: () => void executeClipboardCommand(store, 'copy').catch(() => {}),
    cut: () => void executeClipboardCommand(store, 'cut').catch(() => {}),
    paste: () => void executeClipboardCommand(store, 'paste').catch(() => {}),
    'paste-to-replace': () => void pasteClipboardToReplace(store).catch(() => {}),
    'selection.rename': () => requestRenameSelection(store)
  }
}
