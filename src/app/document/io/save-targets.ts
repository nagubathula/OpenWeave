/** Default save location for documents in the standalone (Tauri) app. */
const DEFAULT_SAVE_DIR = 'openweave'

async function defaultTauriSaveDir(): Promise<string> {
  const { documentDir, join } = await import('@tauri-apps/api/path')
  const { mkdir } = await import('@tauri-apps/plugin-fs')
  const dir = await join(await documentDir(), DEFAULT_SAVE_DIR)
  await mkdir(dir, { recursive: true })
  return dir
}

function figBaseName(documentName: string): string {
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
  const { join } = await import('@tauri-apps/api/path')
  const { exists } = await import('@tauri-apps/plugin-fs')
  const dir = await defaultTauriSaveDir()
  const base = figBaseName(documentName)
  let candidate = await join(dir, `${base}.fig`)
  for (let counter = 2; await exists(candidate); counter++) {
    candidate = await join(dir, `${base} ${counter}.fig`)
  }
  return candidate
}

export async function chooseTauriFigSavePath(documentName = 'Untitled') {
  const { save } = await import('@tauri-apps/plugin-dialog')
  const defaultPath = await defaultTauriFigSavePath(documentName).catch(
    () => `${figBaseName(documentName)}.fig`
  )
  return save({
    defaultPath,
    filters: [{ name: 'Figma file', extensions: ['fig'] }]
  })
}

export async function chooseBrowserFigSaveHandle() {
  if (!window.showSaveFilePicker) return null
  try {
    return await window.showSaveFilePicker({
      suggestedName: 'Untitled.fig',
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
