import {
  manifestFilePaths,
  parsePluginManifest,
  PluginManifestError,
  type PluginManifest
} from '@/app/plugins/manifest'
import type { InstalledPlugin } from '@/app/plugins/storage'

/**
 * Reads a Figma-style plugin folder (manifest.json plus the code and UI files
 * it names) into an installable plugin. Files are copied at install time, so
 * re-install the folder after rebuilding a plugin under development.
 */

const MAX_PLUGIN_FILE_BYTES = 20 * 1024 * 1024

/** A picked file and its path relative to the picked folder's parent. */
export interface PluginSourceFile {
  path: string
  file: Blob
}

function normalizePath(path: string): string {
  const parts: string[] = []
  for (const part of path.replace(/\\/g, '/').split('/')) {
    if (!part || part === '.') continue
    if (part === '..') parts.pop()
    else parts.push(part)
  }
  return parts.join('/')
}

function dirname(path: string): string {
  const index = path.lastIndexOf('/')
  return index === -1 ? '' : path.slice(0, index)
}

async function readText(source: PluginSourceFile): Promise<string> {
  if (source.file.size > MAX_PLUGIN_FILE_BYTES) {
    throw new PluginManifestError(`${source.path} is larger than 20 MB`)
  }
  return source.file.text()
}

export async function readPluginFolder(files: PluginSourceFile[]): Promise<InstalledPlugin> {
  const byPath = new Map(files.map((source) => [normalizePath(source.path), source]))
  // The shallowest manifest.json is the plugin root (nested ones belong to
  // dependencies such as node_modules).
  const manifestPath = [...byPath.keys()]
    .filter((path) => path === 'manifest.json' || path.endsWith('/manifest.json'))
    .sort((a, b) => a.split('/').length - b.split('/').length)[0]
  const manifestSource = manifestPath ? byPath.get(manifestPath) : undefined
  if (!manifestPath || !manifestSource) {
    throw new PluginManifestError('The folder has no manifest.json')
  }

  const manifest: PluginManifest = parsePluginManifest(await readText(manifestSource))
  const root = dirname(manifestPath)
  const read = async (relative: string) => {
    const path = normalizePath(root ? `${root}/${relative}` : relative)
    const source = byPath.get(path)
    if (!source) throw new PluginManifestError(`manifest.json names ${relative}, which is missing`)
    return readText(source)
  }

  // Fail early with the full list rather than one missing file at a time.
  const missing = manifestFilePaths(manifest).filter(
    (relative) => !byPath.has(normalizePath(root ? `${root}/${relative}` : relative))
  )
  if (missing.length > 0) {
    throw new PluginManifestError(`Missing plugin files: ${missing.join(', ')}`)
  }

  let ui: InstalledPlugin['ui'] = null
  if (typeof manifest.ui === 'string') ui = await read(manifest.ui)
  else if (manifest.ui) {
    const entries = await Promise.all(
      Object.entries(manifest.ui).map(async ([name, path]) => [name, await read(path)] as const)
    )
    ui = Object.fromEntries(entries)
  }

  return {
    id: manifest.id,
    name: manifest.name,
    manifest,
    code: await read(manifest.main),
    ui,
    installedAt: new Date().toISOString()
  }
}

/** Opens the system folder picker; resolves to the folder's files, or [] if cancelled. */
export function pickPluginFolder(): Promise<PluginSourceFile[]> {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.multiple = true
    input.webkitdirectory = true
    input.addEventListener(
      'change',
      () => {
        resolve(
          Array.from(input.files ?? [], (file) => ({
            path: file.webkitRelativePath || file.name,
            file
          }))
        )
      },
      { once: true }
    )
    input.addEventListener('cancel', () => resolve([]), { once: true })
    input.click()
  })
}
