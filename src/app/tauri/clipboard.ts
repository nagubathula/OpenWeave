import { invoke } from '@tauri-apps/api/core'
import { readText, writeHtml, writeText } from '@tauri-apps/plugin-clipboard-manager'

import { isTauri } from '@/app/tauri/env'

export async function writeTauriClipboardHtml(html: string, plainText: string) {
  if (!isTauri()) return false
  await writeHtml(html, plainText)
  return true
}

export async function writeTauriClipboardText(text: string) {
  if (!isTauri()) return false
  await writeText(text)
  return true
}

export async function readTauriClipboardText() {
  if (!isTauri()) return null
  return readText()
}

/**
 * Read clipboard text via Rust, which checks the payload size before passing
 * bytes to JS. Avoids allocating a massive JS string that would OOM the WebView.
 *
 * Returns:
 *  - `null`                       — not a design clipboard or nothing to paste
 *  - `'__OW_CLIPBOARD_TOO_LARGE__'` — payload too large (show toast, don't paste)
 *  - the clipboard text           — safe to process
 */
export async function readTauriClipboardHtmlLimited(): Promise<string | null> {
  if (!isTauri()) return null
  return invoke<string | null>('read_clipboard_html_limited')
}
