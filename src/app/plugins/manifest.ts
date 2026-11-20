/**
 * Figma plugin manifest (`manifest.json`) subset OpenWeave understands.
 * https://www.figma.com/plugin-docs/manifest/
 */

export type PluginMenuItem =
  | { name: string; command: string }
  | { separator: true }
  | { name: string; menu: PluginMenuItem[] }

export interface PluginManifest {
  id: string
  name: string
  api?: string
  /** Path to the plugin code, relative to the manifest. */
  main: string
  /** Path to the UI HTML, or a map of named UI files. */
  ui?: string | Record<string, string>
  menu?: PluginMenuItem[]
  editorType?: string[]
  networkAccess?: { allowedDomains?: string[] }
}

export class PluginManifestError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'PluginManifestError'
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function stringField(raw: Record<string, unknown>, key: string): string | undefined {
  const value = raw[key]
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function parseMenu(value: unknown, depth = 0): PluginMenuItem[] | undefined {
  if (!Array.isArray(value) || depth > 4) return undefined
  const items: PluginMenuItem[] = []
  for (const entry of value) {
    if (!isRecord(entry)) continue
    if (entry.separator === true) {
      items.push({ separator: true })
      continue
    }
    const name = stringField(entry, 'name')
    if (!name) continue
    const submenu = parseMenu(entry.menu, depth + 1)
    if (submenu) items.push({ name, menu: submenu })
    else {
      const command = stringField(entry, 'command')
      if (command) items.push({ name, command })
    }
  }
  return items
}

function slug(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 64) || 'plugin'
  )
}

export function parsePluginManifest(json: string): PluginManifest {
  let raw: unknown
  try {
    raw = JSON.parse(json)
  } catch {
    throw new PluginManifestError('manifest.json is not valid JSON')
  }
  if (!isRecord(raw)) throw new PluginManifestError('manifest.json must contain an object')

  const name = stringField(raw, 'name')
  if (!name) throw new PluginManifestError('manifest.json needs a "name"')
  const main = stringField(raw, 'main')
  if (!main) throw new PluginManifestError('manifest.json needs a "main" code file')

  const editorType = Array.isArray(raw.editorType)
    ? raw.editorType.filter((entry): entry is string => typeof entry === 'string')
    : undefined
  if (editorType && editorType.length > 0 && !editorType.includes('figma')) {
    throw new PluginManifestError(
      `This plugin is for ${editorType.join(', ')}; OpenWeave runs Figma design plugins`
    )
  }

  let ui: PluginManifest['ui']
  if (typeof raw.ui === 'string' && raw.ui.trim()) ui = raw.ui.trim()
  else if (isRecord(raw.ui)) {
    const files = Object.entries(raw.ui).filter(
      (entry): entry is [string, string] => typeof entry[1] === 'string'
    )
    if (files.length > 0) ui = Object.fromEntries(files)
  }

  const allowedDomains =
    isRecord(raw.networkAccess) && Array.isArray(raw.networkAccess.allowedDomains)
      ? raw.networkAccess.allowedDomains.filter(
          (entry): entry is string => typeof entry === 'string'
        )
      : undefined

  return {
    id: stringField(raw, 'id') ?? slug(name),
    name,
    api: stringField(raw, 'api'),
    main,
    ui,
    menu: parseMenu(raw.menu),
    editorType,
    networkAccess: allowedDomains ? { allowedDomains } : undefined
  }
}

/** Every file path the manifest references, relative to the manifest. */
export function manifestFilePaths(manifest: PluginManifest): string[] {
  const ui = manifest.ui
  const uiPaths = typeof ui === 'string' ? [ui] : ui ? Object.values(ui) : []
  return [manifest.main, ...uiPaths]
}
