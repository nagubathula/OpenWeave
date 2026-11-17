import { clipboard, ClipboardItem } from 'electron'

import { DESKTOP_CLIPBOARD_TOO_LARGE } from '../src/app/desktop/types'

/**
 * Electron 44 clipboard bridge (the async, ClipboardItem-based API).
 *
 * Design clipboards from Figma can be tens of megabytes. The size is checked
 * on the Blob before decoding so an oversized payload never becomes a string
 * in either process — matching the old Tauri `read_clipboard_html_limited`.
 */
export const MAX_CLIPBOARD_HTML_BYTES = 67_000_000

export async function readClipboardHtml(): Promise<string | null> {
  const items = await clipboard.read()
  for (const item of items) {
    if (!item.types.includes('text/html')) continue
    const blob = await item.getType('text/html')
    if (!(blob instanceof Blob)) continue
    if (blob.size > MAX_CLIPBOARD_HTML_BYTES) return DESKTOP_CLIPBOARD_TOO_LARGE
    return blob.text()
  }
  return null
}

export async function writeClipboardHtml(html: string, altText = '') {
  const data: Record<string, string> = { 'text/html': html }
  if (altText) data['text/plain'] = altText
  await clipboard.write([new ClipboardItem(data)])
}

export const readClipboardText = () => clipboard.readText()
export const writeClipboardText = (text: string) => clipboard.writeText(text)
