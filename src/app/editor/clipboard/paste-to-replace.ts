import { isDesktop } from '@/app/desktop/env'
import type { EditorStore } from '@/app/editor/active-store'
import { readClipboardHtml } from '@/app/editor/clipboard/system'
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
    if (isDesktop()) {
      // On desktop the main-process clipboard read failed — don't show a browser-specific hint.
      toast.error('Paste failed. Try again.')
    } else {
      toast.error(
        'Clipboard access is blocked in this browser context. Press Ctrl+V (or ⌘V) to paste.'
      )
    }
  }
}
