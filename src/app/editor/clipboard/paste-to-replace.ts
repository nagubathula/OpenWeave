import type { EditorStore } from '@/app/editor/active-store'
import { readClipboardHtml } from '@/app/editor/clipboard/system'
import { isTauri } from '@/app/tauri/env'
import { toast } from '@/app/shell/ui'

export async function pasteClipboardToReplace(store: EditorStore) {
  try {
    const html = await readClipboardHtml()
    if (!html) {
      toast.error('Clipboard does not contain design data')
      return
    }
    await store.pasteFromHTML(html, undefined, { replaceSelection: true })
  } catch (error) {
    console.warn('Paste to replace failed', error)
    if (isTauri()) {
      // In Tauri the Rust command failed — don't show a browser-specific hint.
      toast.error('Paste failed. Try again.')
    } else {
      toast.error(
        'Clipboard access is blocked in this browser context. Press Ctrl+V (or ⌘V) to paste.'
      )
    }
  }
}
