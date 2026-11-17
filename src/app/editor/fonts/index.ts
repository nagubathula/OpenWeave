import { persistentAtom } from '@nanostores/persistent'

import {
  DEFAULT_WEB_FONT_PROVIDER_SETTINGS,
  WEB_FONT_PROVIDER_IDS,
  collectGraphFontRequirements,
  fontManager,
  missingGraphFontScripts,
  type FontFamilyOption,
  type LocalFontAccessState,
  type WebFontProviderId
} from '@openweave/core/text'
import { dialogMessages } from '@openweave/react'
import type { SceneGraph } from '@openweave/scene-graph'

import { getDesktopBridge, isDesktop } from '@/app/desktop/env'
import { desktopFetch } from '@/app/desktop/http'
import {
  clearDownloadedFontCache as clearDesktopDownloadedFontCache,
  createDesktopDownloadedFontCache,
  downloadedFontCacheSummary as desktopDownloadedFontCacheSummary
} from '@/app/editor/fonts/cache'
import { toast } from '@/app/shell/ui'

if (typeof navigator !== 'undefined') {
  fontManager.setFallbackUserAgent(navigator.userAgent)
}

export type FontProviderSettings = Record<WebFontProviderId, boolean>

export const onlineFontsEnabled = persistentAtom<boolean>('op-online-fonts-enabled', true, {
  encode: String,
  decode: (raw) => raw !== 'false'
})
export const fontProviderSettings = persistentAtom<FontProviderSettings>(
  'op-font-providers',
  DEFAULT_WEB_FONT_PROVIDER_SETTINGS,
  { encode: JSON.stringify, decode: JSON.parse }
)

function applyOnlineFontProviders() {
  fontManager.setOnlineFontProviders(
    onlineFontsEnabled.get()
      ? Object.fromEntries(
          WEB_FONT_PROVIDER_IDS.map((provider) => [provider, fontProviderSettings.get()[provider]])
        )
      : {}
  )
}

applyOnlineFontProviders()
onlineFontsEnabled.listen(applyOnlineFontProviders)
fontProviderSettings.listen(applyOnlineFontProviders)

let desktopFontCacheConfigured = false
let webFontUnavailableToastShown = false

function showWebFontUnavailableToast(): void {
  if (webFontUnavailableToastShown || isDesktop() || !onlineFontsEnabled.get()) return
  if (!WEB_FONT_PROVIDER_IDS.some((provider) => fontProviderSettings.get()[provider])) return
  webFontUnavailableToastShown = true
  toast.warning(dialogMessages.get().webFontProvidersRequireDesktopApp)
}

function configureDesktopFontCache() {
  if (desktopFontCacheConfigured || !isDesktop()) return
  desktopFontCacheConfigured = true
  fontManager.setDownloadedFontCache(createDesktopDownloadedFontCache())
  fontManager.setWebFontFetch(desktopFetch)
  fontManager.setHostFontLoader(loadSystemFont)
}

configureDesktopFontCache()

interface SystemFontFamily {
  family: string
  styles: string[]
}

let systemFontsCache: SystemFontFamily[] | null = null
let systemFontsPromise: Promise<SystemFontFamily[]> | null = null

function getElectron() {
  if (typeof window === 'undefined') return null
  return getDesktopBridge()
}

async function getSystemFonts(): Promise<SystemFontFamily[]> {
  if (systemFontsCache) return systemFontsCache
  if (!systemFontsPromise) {
    const electron = getElectron()
    if (electron?.fonts?.listFamilies) {
      systemFontsPromise = electron.fonts
        .listFamilies()
        .then((fonts: SystemFontFamily[]) => {
          systemFontsCache = fonts
          return fonts
        })
        .catch(() => [])
    } else {
      systemFontsPromise = Promise.resolve([])
    }
  }
  return systemFontsPromise ?? []
}

export function preloadFonts(): void {
  configureDesktopFontCache()
  if (isDesktop()) {
    void getSystemFonts().then(registerFontFaces)
    return
  }
  if (onlineFontsEnabled.get()) fontManager.preloadWebFontFamilies()
}

export function localFontAccessState(): LocalFontAccessState {
  return isDesktop() ? 'granted' : fontManager.localAccessState()
}

export async function requestLocalFontAccess(): Promise<FontFamilyOption[]> {
  if (isDesktop()) return listFamilies()
  await fontManager.requestLocalFontAccess()
  return listFamilies()
}

export async function downloadedFontCacheSummary() {
  configureDesktopFontCache()
  if (!isDesktop()) return { count: 0, byteLength: 0, updatedAt: null }
  return desktopDownloadedFontCacheSummary()
}

export async function clearDownloadedFontCache(): Promise<void> {
  configureDesktopFontCache()
  if (!isDesktop()) return
  await clearDesktopDownloadedFontCache()
}

export async function predownloadFallbackFonts() {
  return fontManager.ensureFallbackPack()
}

function registerFontFaces(fonts: SystemFontFamily[]): void {
  if (typeof document === 'undefined') return
  for (const { family } of fonts) {
    const face = new FontFace(family, `local("${family}")`)
    document.fonts.add(face)
  }
}

export async function listFamilies(): Promise<FontFamilyOption[]> {
  configureDesktopFontCache()
  if (isDesktop()) {
    const [systemFonts, webFonts] = await Promise.all([
      getSystemFonts(),
      fontManager.listFamilyOptions()
    ])
    const byFamily = new Map(webFonts.map((font) => [font.family, font]))
    for (const font of systemFonts)
      byFamily.set(font.family, { family: font.family, source: 'local' })
    return [...byFamily.values()].sort((a, b) => a.family.localeCompare(b.family))
  }
  showWebFontUnavailableToast()
  return fontManager.listFamilyOptions()
}

export async function listFonts(): Promise<SystemFontFamily[]> {
  configureDesktopFontCache()
  if (isDesktop()) {
    return getSystemFonts()
  }
  return []
}

/**
 * Real face names available for a family ("Regular", "Semi Bold Italic", …),
 * from the desktop system font list. Empty when unknown (plain browser,
 * or a web-only family) — callers fall back to the generic weight list.
 */
export async function listFamilyStyles(family: string): Promise<string[]> {
  configureDesktopFontCache()
  if (!isDesktop()) return []
  const fonts = await getSystemFonts()
  const match =
    fonts.find((font) => font.family === family) ??
    fonts.find((font) => font.family.toLowerCase() === family.toLowerCase())
  return match ? [...new Set(match.styles)] : []
}

interface FontRenderInvalidator {
  invalidateAllPictures(): void
}

export async function ensureGraphFonts(
  graph: SceneGraph,
  nodeIds: string[],
  renderer?: FontRenderInvalidator | null
): Promise<boolean> {
  fontManager.blockNodesUntilFontsResolve(nodeIds)
  try {
    const generationBefore = fontManager.generation()
    const fontKeys = fontManager.collectFontKeys(graph, nodeIds)
    const requirements = collectGraphFontRequirements(graph, nodeIds)
    const { characters } = requirements
    await Promise.all(fontKeys.map(([family, style]) => loadFont(family, style, characters)))
    const fallbackScripts = missingGraphFontScripts(requirements)
    if (fallbackScripts.length > 0) {
      const fallbacks = await fontManager.ensureFallbackPack(fallbackScripts, characters)
      if (Object.values(fallbacks).some((families) => families.length > 0)) {
        clearTextPictures(graph, nodeIds)
      }
    } else if (fontManager.generation() !== generationBefore) {
      clearTextPictures(graph, nodeIds)
    }
    return fontManager.generation() !== generationBefore || fallbackScripts.length > 0
  } finally {
    fontManager.unblockNodes(nodeIds)
    renderer?.invalidateAllPictures()
  }
}

function clearTextPictures(graph: SceneGraph, nodeIds: string[]): void {
  const clear = (id: string) => {
    const node = graph.getNode(id)
    if (!node) return
    if (node.type === 'TEXT') node.textPicture = null
    for (const childId of node.childIds) clear(childId)
  }
  for (const id of nodeIds) clear(id)
}

async function loadSystemFont(family: string, style = 'Regular'): Promise<ArrayBuffer | null> {
  if (!isDesktop()) return null
  try {
    const electron = getElectron()
    if (!electron?.fonts?.loadFont) return null
    const data = await electron.fonts.loadFont(family, style)
    if (!data?.length) return null
    return new Uint8Array(data).buffer
  } catch {
    return null
  }
}

export async function loadFont(
  family: string,
  style = 'Regular',
  characters = ''
): Promise<ArrayBuffer | null> {
  configureDesktopFontCache()
  const loaded = await fontManager.loadFont(family, style, characters)
  if (!loaded) showWebFontUnavailableToast()
  return loaded
}
