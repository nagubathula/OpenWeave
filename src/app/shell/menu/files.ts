import { setOpenWeaveOpenFileHandler } from '@/app/browser-bridge'
import { resolveBrowserFileURL } from '@/app/document/io/browser'
import { openFileInNewTab } from '@/app/tabs'
import { isTauri } from '@/app/tauri/env'
import { IS_BROWSER } from '@/constants'

/** Fallback file picker for browsers without `showOpenFilePicker`. */
function openLegacyFileDialog() {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.fig,.pen,.html,.htm,.xhtml'
  input.onchange = () => {
    const file = input.files?.[0]
    if (file) void openFileInNewTab(file)
  }
  input.click()
}

if (IS_BROWSER && 'window' in globalThis) {
  setOpenWeaveOpenFileHandler(async (path: string) => {
    const resourceURL = resolveBrowserFileURL(path)
    const response = await fetch(resourceURL)
    const blob = await response.blob()
    const name = resourceURL.pathname.split('/').pop() ?? 'file.fig'
    const file = new File([blob], name, { type: 'application/octet-stream' })
    await openFileInNewTab(file, undefined, resourceURL.href)
  })
}

export async function readTauriDesignFile(path: string): Promise<File> {
  const electron =
    typeof window !== 'undefined' ? (window as any).electron || (window as any).electronAPI : null
  if (electron?.fs?.readFile) {
    const bytes = await electron.fs.readFile(path)
    const name = path.split(/[/\\]/).pop() ?? 'file.fig'
    return new File([bytes], name)
  }
  throw new Error('Electron fs not available')
}

export async function chooseTauriOpenPath(): Promise<string | null> {
  const electron =
    typeof window !== 'undefined' ? (window as any).electron || (window as any).electronAPI : null
  if (electron?.dialog?.showOpenDialog) {
    const paths = await electron.dialog.showOpenDialog({
      filters: [{ name: 'Design file', extensions: ['fig', 'pen', 'html', 'htm', 'xhtml'] }],
      multiple: false
    })
    return Array.isArray(paths) ? (paths[0] ?? null) : typeof paths === 'string' ? paths : null
  }
  return null
}

export async function openFileFromPath(path: string) {
  if (!isTauri()) return
  const file = await readTauriDesignFile(path)
  await openFileInNewTab(file, undefined, path)
}

export async function openFileDialog() {
  if (isTauri()) {
    const path = await chooseTauriOpenPath()
    if (!path) return
    await openFileFromPath(path)
    return
  }

  if (window.showOpenFilePicker) {
    try {
      const [handle] = await window.showOpenFilePicker({
        types: [
          {
            description: 'Design file',
            accept: {
              'application/octet-stream': ['.fig'],
              'application/json': ['.pen'],
              'text/html': ['.html', '.htm'],
              'application/xhtml+xml': ['.xhtml'],
              'text/plain': ['.pen']
            }
          }
        ]
      })
      const file = await handle.getFile()
      await openFileInNewTab(file, handle)
      return
    } catch (e) {
      if ((e as Error).name === 'AbortError') return
    }
  }

  openLegacyFileDialog()
}

export async function importFileDialog() {
  await openFileDialog()
}
