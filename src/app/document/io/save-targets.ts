/** Default save location for documents in the standalone (Tauri) app. */
const DEFAULT_SAVE_DIR = 'openweave'

function getElectron() {
  if (typeof window === 'undefined') return null
  return (window as any).electron || (window as any).electronAPI || null
}

export async function defaultTauriSaveDir(): Promise<string> {
  const electron = getElectron()
  if (electron?.app?.getPath) {
    const docDir = await electron.app.getPath('documents')
    const dir = electron.path?.join
      ? await electron.path.join(docDir, DEFAULT_SAVE_DIR)
      : `${docDir}/${DEFAULT_SAVE_DIR}`
    if (electron.fs?.mkdir) await electron.fs.mkdir(dir, { recursive: true })
    return dir
  }
  return DEFAULT_SAVE_DIR
}

export function figBaseName(documentName: string): string {
  // Strip path separators so a document name can't escape the save folder.
  const base = documentName.trim().replace(/[\\/]/g, '-')
  return base || 'Untitled'
}

/**
 * Path for a plain Save of a not-yet-saved document: Documents/openweave/
 * <name>.fig, suffixed to stay unique so an existing file is never silently
 * overwritten. Only Save As opens a picker.
 */
export async function defaultTauriFigSavePath(documentName: string): Promise<string> {
  const electron = getElectron()
  const dir = await defaultTauriSaveDir()
  const base = figBaseName(documentName)
  const join = electron?.path?.join
    ? electron.path.join
    : async (a: string, b: string) => `${a}/${b}`
  const exists = electron?.fs?.exists ? electron.fs.exists : async () => false
  let candidate = await join(dir, `${base}.fig`)
  for (let counter = 2; await exists(candidate); counter++) {
    candidate = await join(dir, `${base} ${counter}.fig`)
  }
  return candidate
}

export async function chooseTauriFigSavePath(documentName = 'Untitled'): Promise<string | null> {
  const electron = getElectron()
  const defaultPath = await defaultTauriFigSavePath(documentName).catch(
    () => `${figBaseName(documentName)}.fig`
  )
  if (electron?.dialog?.showSaveDialog) {
    return electron.dialog.showSaveDialog({
      defaultPath,
      filters: [{ name: 'Figma file', extensions: ['fig'] }]
    })
  }
  return null
}

export async function chooseBrowserFigSaveHandle(
  suggestedName = 'Untitled.fig'
): Promise<FileSystemFileHandle | null> {
  if (!window.showSaveFilePicker) return null
  try {
    return await window.showSaveFilePicker({
      suggestedName,
      types: [
        {
          description: 'Figma file',
          accept: { 'application/octet-stream': ['.fig'] }
        }
      ]
    })
  } catch (error) {
    if ((error as Error).name === 'AbortError') return null
    throw error
  }
}
