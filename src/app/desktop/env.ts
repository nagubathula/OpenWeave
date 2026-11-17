import type { DesktopBridge } from '@/app/desktop/types'

/**
 * The Electron preload bridge (`desktop-electron/preload.ts`), or `null` in a
 * plain browser tab. All desktop-only behavior should branch on this.
 */
export function getDesktopBridge(): DesktopBridge | null {
  if (typeof window === 'undefined') return null
  return window.electron ?? null
}

export function isDesktop(): boolean {
  return getDesktopBridge() !== null
}
