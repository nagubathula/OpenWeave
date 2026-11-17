import { getDesktopBridge } from '@/app/desktop/env'
import { DESKTOP_CLIPBOARD_TOO_LARGE } from '@/app/desktop/types'

export { DESKTOP_CLIPBOARD_TOO_LARGE }

export async function writeDesktopClipboardHtml(html: string, plainText: string) {
  const bridge = getDesktopBridge()
  if (!bridge) return false
  await bridge.clipboard.writeHtml(html, plainText)
  return true
}

export async function writeDesktopClipboardText(text: string) {
  const bridge = getDesktopBridge()
  if (!bridge) return false
  await bridge.clipboard.writeText(text)
  return true
}

export async function readDesktopClipboardText() {
  return (await getDesktopBridge()?.clipboard.readText()) ?? null
}

/**
 * Clipboard HTML read in the main process. Payloads over the size limit come
 * back as `DESKTOP_CLIPBOARD_TOO_LARGE` instead of crossing IPC as a string.
 */
export async function readDesktopClipboardHtml(): Promise<string | null> {
  return (await getDesktopBridge()?.clipboard.readHtml()) ?? null
}
