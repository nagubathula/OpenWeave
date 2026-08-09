import type { ClipboardImageResolution, Editor } from '@openweave/core/editor'
import { dialogMessages } from '@openweave/vue'

import { toast } from '@/app/shell/ui'

export function notifyClipboardImageResolution({
  total,
  missing,
  fetchAttempted
}: ClipboardImageResolution) {
  const messages = dialogMessages.get()
  if (!fetchAttempted) {
    toast.warning(
      total === 1
        ? messages.clipboardImageUnavailableWeb
        : messages.clipboardImagesUnavailableWeb({ count: total })
    )
    return
  }

  toast.error(
    missing === 1
      ? messages.clipboardImageFetchFailed
      : messages.clipboardImagesFetchFailed({ count: missing })
  )
}

export function bindClipboardNotifications(editor: Editor) {
  return editor.onEditorEvent('clipboard:images-missing', notifyClipboardImageResolution)
}
