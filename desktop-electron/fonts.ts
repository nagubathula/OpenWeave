import { open, readdir, readFile } from 'node:fs/promises'
import * as path from 'node:path'

/**
 * System font discovery for the desktop shell.
 *
 * Reads only the sfnt table directory plus the `name` and `OS/2` tables of
 * each file (a few KB) instead of parsing whole fonts, so scanning hundreds
 * of system fonts stays fast. Style names follow the former Tauri/font-kit
 * scanner ("Regular", "SemiBold Italic", …) because the renderer maps them
 * back to weights.
 */

export interface SystemFontFamily {
  family: string
  styles: string[]
}

interface FontFace {
  family: string
  style: string
  file: string
}

const FONT_EXTENSIONS = new Set(['.ttf', '.otf', '.ttc'])
const MAX_SCAN_DEPTH = 4
const HEADER_READ_BYTES = 64 * 1024

/** Upper weight bound → style name, matching the former font-kit scanner. */
const WEIGHT_STYLES: Array<[number, string]> = [
  [150, 'Thin'],
  [250, 'ExtraLight'],
  [350, 'Light'],
  [450, 'Regular'],
  [550, 'Medium'],
  [650, 'SemiBold'],
  [750, 'Bold'],
  [850, 'ExtraBold']
]

export function weightStyleName(weight: number, italic: boolean): string {
  const base = WEIGHT_STYLES.find(([max]) => weight <= max)?.[1] ?? 'Black'
  return italic ? `${base} Italic` : base
}

export function systemFontDirs(env = process.env, platform = process.platform): string[] {
  if (platform === 'win32') {
    const dirs = [path.win32.join(env.WINDIR ?? 'C:\\Windows', 'Fonts')]
    if (env.LOCALAPPDATA)
      dirs.push(path.win32.join(env.LOCALAPPDATA, 'Microsoft', 'Windows', 'Fonts'))
    return dirs
  }
  const home = env.HOME ?? ''
  if (platform === 'darwin') {
    return ['/System/Library/Fonts', '/Library/Fonts', path.posix.join(home, 'Library/Fonts')]
  }
  return [
    '/usr/share/fonts',
    '/usr/local/share/fonts',
    path.posix.join(home, '.fonts'),
    path.posix.join(home, '.local/share/fonts')
  ]
}

function decodeNameRecord(view: DataView, offset: number, length: number, platformId: number) {
  if (platformId === 0 || platformId === 3) {
    let text = ''
    for (let i = 0; i + 1 < length; i += 2) text += String.fromCharCode(view.getUint16(offset + i))
    return text
  }
  let text = ''
  for (let i = 0; i < length; i++) text += String.fromCharCode(view.getUint8(offset + i))
  return text
}

interface TableRecord {
  offset: number
  length: number
}

function readTableDirectory(view: DataView, fontOffset: number): Map<string, TableRecord> | null {
  if (fontOffset + 12 > view.byteLength) return null
  const numTables = view.getUint16(fontOffset + 4)
  const tables = new Map<string, TableRecord>()
  for (let i = 0; i < numTables; i++) {
    const record = fontOffset + 12 + i * 16
    if (record + 16 > view.byteLength) return null
    const tag = String.fromCharCode(
      view.getUint8(record),
      view.getUint8(record + 1),
      view.getUint8(record + 2),
      view.getUint8(record + 3)
    )
    tables.set(tag, { offset: view.getUint32(record + 8), length: view.getUint32(record + 12) })
  }
  return tables
}

function isEnglishName(platformId: number, languageId: number): boolean {
  if (platformId === 3) return languageId === 0x409
  if (platformId === 1) return languageId === 0
  return true
}

/** Typographic family (name ID 16), falling back to the legacy family (ID 1). */
function readFamilyName(view: DataView, name: TableRecord): string | null {
  if (name.offset + name.length > view.byteLength) return null
  const count = view.getUint16(name.offset + 2)
  const storage = name.offset + view.getUint16(name.offset + 4)
  const names = new Map<number, string>()
  for (let i = 0; i < count; i++) {
    const record = name.offset + 6 + i * 12
    const platformId = view.getUint16(record)
    const nameId = view.getUint16(record + 6)
    if (nameId !== 1 && nameId !== 16) continue
    if (!isEnglishName(platformId, view.getUint16(record + 4)) && names.has(nameId)) continue
    const length = view.getUint16(record + 8)
    const offset = storage + view.getUint16(record + 10)
    if (offset + length > view.byteLength) continue
    names.set(nameId, decodeNameRecord(view, offset, length, platformId))
  }
  return (names.get(16) ?? names.get(1))?.trim() || null
}

/**
 * Extracts family name, weight and italic flag from one sfnt font starting at
 * `fontOffset`. Returns null when the needed tables are outside `view`.
 */
export function readFaceInfo(
  view: DataView,
  fontOffset = 0
): { family: string; weight: number; italic: boolean } | null {
  const tables = readTableDirectory(view, fontOffset)
  const name = tables?.get('name')
  const family = name ? readFamilyName(view, name) : null
  if (!tables || !family) return null

  const os2 = tables.get('OS/2')
  if (!os2 || os2.offset + 64 > view.byteLength) return { family, weight: 400, italic: false }
  return {
    family,
    weight: view.getUint16(os2.offset + 4) || 400,
    italic: (view.getUint16(os2.offset + 62) & 0x1) !== 0
  }
}

/** Face info for a font file, or the first face of a `.ttc` collection. */
function readFirstFaceInfo(view: DataView) {
  if (view.byteLength < 16) return null
  const isCollection = view.getUint32(0) === 0x74746366 // 'ttcf'
  return readFaceInfo(view, isCollection ? view.getUint32(12) : 0)
}

/** Reads the first 64 KB, then the whole file when `name` lies beyond it. */
async function readFontFileFace(file: string) {
  const handle = await open(file, 'r')
  try {
    const buffer = Buffer.alloc(HEADER_READ_BYTES)
    const { bytesRead } = await handle.read(buffer, 0, HEADER_READ_BYTES, 0)
    const header = readFirstFaceInfo(new DataView(buffer.buffer, buffer.byteOffset, bytesRead))
    if (header || bytesRead < HEADER_READ_BYTES) return header
  } finally {
    await handle.close()
  }
  const full = await readFile(file)
  return readFirstFaceInfo(new DataView(full.buffer, full.byteOffset, full.byteLength))
}

async function collectFontFiles(dir: string, depth = 0, out: string[] = []): Promise<string[]> {
  let entries
  try {
    entries = await readdir(dir, { withFileTypes: true })
  } catch {
    return out
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory() && depth < MAX_SCAN_DEPTH) await collectFontFiles(full, depth + 1, out)
    else if (entry.isFile() && FONT_EXTENSIONS.has(path.extname(entry.name).toLowerCase()))
      out.push(full)
  }
  return out
}

let facesPromise: Promise<FontFace[]> | null = null

function scanFaces(): Promise<FontFace[]> {
  facesPromise ??= (async () => {
    const files = (await Promise.all(systemFontDirs().map((dir) => collectFontFiles(dir)))).flat()
    const faces: FontFace[] = []
    for (const file of files) {
      try {
        const info = await readFontFileFace(file)
        if (info)
          faces.push({
            family: info.family,
            style: weightStyleName(info.weight, info.italic),
            file
          })
      } catch (error) {
        // Unreadable or malformed font files are skipped, as the OS font list does.
        if (process.env.OPENWEAVE_DEBUG_FONTS) console.warn('[fonts] skipped', file, error)
      }
    }
    return faces
  })()
  return facesPromise
}

export async function listSystemFontFamilies(): Promise<SystemFontFamily[]> {
  const byFamily = new Map<string, Set<string>>()
  for (const face of await scanFaces()) {
    const styles = byFamily.get(face.family) ?? new Set<string>()
    styles.add(face.style)
    byFamily.set(face.family, styles)
  }
  return [...byFamily.entries()]
    .map(([family, styles]) => ({ family, styles: [...styles] }))
    .sort((a, b) => a.family.localeCompare(b.family))
}

export async function loadSystemFont(
  family: string,
  style = 'Regular'
): Promise<Uint8Array | null> {
  const normalize = (value: string) => value.toLowerCase().replaceAll(/[\s_-]/g, '')
  const faces = (await scanFaces()).filter((face) => normalize(face.family) === normalize(family))
  const face =
    faces.find((f) => f.style === style) ??
    faces.find((f) => normalize(f.style) === normalize(style)) ??
    faces.find((f) => f.style === 'Regular') ??
    faces[0]
  if (!face) return null
  return new Uint8Array(await readFile(face.file))
}
