import type { Vector } from '@openweave/scene-graph/primitives'

import { readDesktopClipboardHtml, writeDesktopClipboardHtml } from '@/app/desktop/clipboard'
import { isDesktop } from '@/app/desktop/env'
import type { EditorStore } from '@/app/editor/active-store'

function createTransfer() {
  if (typeof DataTransfer === 'undefined') return null
  return new DataTransfer()
}

function isDesignClipboardHtml(text: string) {
  return text.includes('<!--(openweave)') || text.includes('(figma)')
}

async function captureTransferPayload(store: EditorStore) {
  const transfer = createTransfer()
  if (!transfer) return null
  await store.writeCopyData(transfer)
  const html = transfer.getData('text/html')
  const plainText = transfer.getData('text/plain')
  if (!html && !plainText) return null
  return { html, plainText }
}

export async function copySelectionToDesktopClipboard(store: EditorStore) {
  if (!isDesktop()) return false
  try {
    const payload = await captureTransferPayload(store)
    if (!payload) return false
    await writeDesktopClipboardHtml(payload.html || payload.plainText, payload.plainText)
    return true
  } catch (error) {
    console.warn('Desktop clipboard copy failed', error)
    return false
  }
}

export async function pasteFromDesktopClipboard(store: EditorStore, cursorPos?: Vector) {
  if (!isDesktop()) return false
  try {
    const text = await readDesktopClipboardHtml()
    console.log(
      '[OW-PASTE] Desktop clipboard returned:',
      text === null
        ? 'null'
        : text === '__OW_CLIPBOARD_TOO_LARGE__'
          ? 'TOO_LARGE'
          : `string(${text.length})`
    )
    if (!text) return false
    // The main process flagged the payload as too large before decoding it.
    if (text === '__OW_CLIPBOARD_TOO_LARGE__') {
      store.emitEditorEvent('clipboard:paste-failed', { reason: 'too-large' })
      return true
    }
    if (!isDesignClipboardHtml(text)) {
      console.log('[OW-PASTE] isDesignClipboardHtml=false — not a design clipboard')
      return false
    }
    await store.pasteFromHTML(text, cursorPos)
    return true
  } catch (error) {
    console.warn('Desktop clipboard paste failed', error)
    return false
  }
}

export async function copySelectionToBrowserClipboard(store: EditorStore): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.clipboard?.write) return false
  try {
    const payload = await captureTransferPayload(store)
    if (!payload) return false
    const { html, plainText } = payload

    if (typeof ClipboardItem !== 'undefined') {
      const data: Record<string, Blob> = {}
      if (html) data['text/html'] = new Blob([html], { type: 'text/html' })
      if (plainText) data['text/plain'] = new Blob([plainText], { type: 'text/plain' })
      await navigator.clipboard.write([new ClipboardItem(data)])
      return true
    }
    if (plainText && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(plainText)
      return true
    }
    return false
  } catch (error) {
    console.debug('Browser clipboard copy failed', error)
    return false
  }
}

export async function readClipboardHtml(): Promise<string | null> {
  if (isDesktop()) {
    try {
      const text = await readDesktopClipboardHtml()
      // Treat too-large sentinel as nothing available; caller handles the event separately.
      if (!text || text === '__OW_CLIPBOARD_TOO_LARGE__') return null
      return isDesignClipboardHtml(text) ? text : null
    } catch {
      return null
    }
  }

  if (typeof navigator === 'undefined' || !navigator.clipboard) return null

  if (typeof navigator.clipboard.read === 'function') {
    try {
      const items = await navigator.clipboard.read()
      for (const item of items) {
        if (!item.types.includes('text/html')) continue
        try {
          const blob = await item.getType('text/html')
          const text = await blob.text()
          if (text && isDesignClipboardHtml(text)) return text
        } catch {
          // Format unavailable on this item
        }
      }
    } catch (error) {
      console.debug('navigator.clipboard.read failed, trying readText', error)
    }
  }

  if (typeof navigator.clipboard.readText === 'function') {
    try {
      const text = await navigator.clipboard.readText()
      if (text && isDesignClipboardHtml(text)) return text
    } catch (error) {
      console.debug('navigator.clipboard.readText failed', error)
    }
  }

  return null
}

export async function pasteFromBrowserClipboard(
  store: EditorStore,
  cursorPos?: Vector
): Promise<boolean> {
  try {
    const pos =
      cursorPos ??
      (store.state.cursorCanvasX != null && store.state.cursorCanvasY != null
        ? { x: store.state.cursorCanvasX, y: store.state.cursorCanvasY }
        : undefined)

    const html = await readClipboardHtml()
    if (html) {
      await store.pasteFromHTML(html, pos)
      return true
    }

    if (typeof navigator !== 'undefined' && typeof navigator.clipboard?.read === 'function') {
      try {
        const items = await navigator.clipboard.read()
        for (const item of items) {
          const imageType = item.types.find((t) => t.startsWith('image/'))
          if (imageType) {
            try {
              const blob = await item.getType(imageType)
              const file = new File([blob], 'pasted-image', { type: imageType })
              const cx = pos?.x ?? (-store.state.panX + window.innerWidth / 2) / store.state.zoom
              const cy = pos?.y ?? (-store.state.panY + window.innerHeight / 2) / store.state.zoom
              await store.placeImageFiles([file], cx, cy)
              return true
            } catch {
              // Image type retrieval failed
            }
          }
        }
      } catch (error) {
        console.debug('Image paste failed', error)
      }
    }

    return false
  } catch (error) {
    console.debug('pasteFromBrowserClipboard failed', error)
    return false
  }
}

export async function executeClipboardCommand(
  store: EditorStore,
  command: 'copy' | 'cut' | 'paste'
): Promise<boolean> {
  try {
    if (command === 'copy') {
      if (await copySelectionToDesktopClipboard(store)) return true
      if (await copySelectionToBrowserClipboard(store)) return true
    }

    if (command === 'cut') {
      if (await copySelectionToDesktopClipboard(store)) {
        store.deleteSelected()
        return true
      }
      if (await copySelectionToBrowserClipboard(store)) {
        store.deleteSelected()
        return true
      }
    }

    if (command === 'paste') {
      if (await pasteFromDesktopClipboard(store)) return true
      // Never call pasteFromBrowserClipboard on desktop — navigator.clipboard.read()
      // is blocked by WebView2 and shows the browser's native permission prompt.
      if (!isDesktop() && (await pasteFromBrowserClipboard(store))) return true
    }

    try {
      return document.execCommand(command)
    } catch (error) {
      console.warn(`Clipboard command ${command} failed`, error)
      return false
    }
  } catch (error) {
    console.debug(`Clipboard command ${command} failed`, error)
    return false
  }
}
