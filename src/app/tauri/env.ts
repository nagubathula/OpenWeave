export function isElectron(): boolean {
  if (typeof window === 'undefined') return false
  return 'electron' in window || 'electronAPI' in window || '__TAURI_INTERNALS__' in window
}

export function isDesktop(): boolean {
  return isElectron()
}

/** @deprecated Use isElectron() or isDesktop() */
export function isTauri(): boolean {
  return isElectron()
}
