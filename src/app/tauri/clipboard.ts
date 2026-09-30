import { isElectron } from '@/app/tauri/env'

function getElectron() {
  if (typeof window === 'undefined') return null
  return (window as any).electron || (window as any).electronAPI || null
}

export async function writeTauriClipboardHtml(html: string, plainText: string) {
  if (!isElectron()) return false
  const electron = getElectron()
  if (electron?.clipboard?.writeHtml) {
    await electron.clipboard.writeHtml(html, plainText)
    return true
  }
  return false
}

export async function writeTauriClipboardText(text: string) {
  if (!isElectron()) return false
  const electron = getElectron()
  if (electron?.clipboard?.writeText) {
    await electron.clipboard.writeText(text)
    return true
  }
  return false
}

export async function readTauriClipboardText() {
  if (!isElectron()) return null
  const electron = getElectron()
  if (electron?.clipboard?.readText) {
    return electron.clipboard.readText()
  }
  return null
}

/**
 * Read clipboard HTML via Electron.
 */
export async function readTauriClipboardHtmlLimited(): Promise<string | null> {
  if (!isElectron()) return null
  const electron = getElectron()
  if (electron?.clipboard?.readHtml) {
    return electron.clipboard.readHtml()
  }
  return null
}
