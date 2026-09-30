import { atom } from 'nanostores'

import {
  cardWidthFromPpi,
  DEFAULT_MOBILE_LOGICAL_DPI,
  detectMobileFrameDimensions,
  POPULAR_DISPLAY_PRESETS,
  ppiFromCardWidth,
  STANDARD_CSS_PPI,
  zoomForDevice,
  zoomForPhysical,
  type DisplayScaleSettings
} from './types'

const DISPLAY_SCALE_STORAGE_KEY = 'openweave:display-scale'

function getDefaultDisplayPpi(): number {
  if (typeof window === 'undefined') return STANDARD_CSS_PPI

  // If on macOS retina screen, typical CSS PPI is ~127 (MacBook Retina at 2x)
  const isMac =
    typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/.test(navigator.platform ?? '')
  if (isMac && window.devicePixelRatio >= 2) {
    return 127
  }

  return STANDARD_CSS_PPI
}

function loadInitialSettings(): DisplayScaleSettings {
  const defaultPpi = getDefaultDisplayPpi()
  const defaultCardWidth = cardWidthFromPpi(defaultPpi)

  if (typeof window === 'undefined') {
    return {
      screenPpi: defaultPpi,
      cardWidthPx: defaultCardWidth,
      isCalibrated: false
    }
  }

  try {
    const raw = window.localStorage.getItem(DISPLAY_SCALE_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<DisplayScaleSettings>
      if (typeof parsed.screenPpi === 'number' && parsed.screenPpi > 30 && parsed.screenPpi < 500) {
        return {
          screenPpi: parsed.screenPpi,
          cardWidthPx:
            typeof parsed.cardWidthPx === 'number'
              ? parsed.cardWidthPx
              : cardWidthFromPpi(parsed.screenPpi),
          isCalibrated: Boolean(parsed.isCalibrated),
          lastCalibratedAt: parsed.lastCalibratedAt,
          presetId: parsed.presetId
        }
      }
    }
  } catch {
    // Fall back to defaults on corrupt storage
  }

  return {
    screenPpi: defaultPpi,
    cardWidthPx: defaultCardWidth,
    isCalibrated: false
  }
}

export const displayScaleSettings = atom<DisplayScaleSettings>(loadInitialSettings())

function persistSettings(settings: DisplayScaleSettings) {
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(DISPLAY_SCALE_STORAGE_KEY, JSON.stringify(settings))
    } catch {
      // Ignore storage errors in restricted contexts
    }
  }
}

export function calibrateWithCardWidth(
  cardWidthPx: number,
  presetId?: string
): DisplayScaleSettings {
  const clampedWidth = Math.max(120, Math.min(800, cardWidthPx))
  const ppi = ppiFromCardWidth(clampedWidth)
  const next: DisplayScaleSettings = {
    screenPpi: ppi,
    cardWidthPx: clampedWidth,
    isCalibrated: true,
    lastCalibratedAt: Date.now(),
    presetId
  }
  displayScaleSettings.set(next)
  persistSettings(next)
  return next
}

export function calibrateWithPpi(screenPpi: number, presetId?: string): DisplayScaleSettings {
  const clampedPpi = Math.max(30, Math.min(400, screenPpi))
  const cardWidth = cardWidthFromPpi(clampedPpi)
  const next: DisplayScaleSettings = {
    screenPpi: clampedPpi,
    cardWidthPx: cardWidth,
    isCalibrated: true,
    lastCalibratedAt: Date.now(),
    presetId
  }
  displayScaleSettings.set(next)
  persistSettings(next)
  return next
}

export function resetDisplayScaleSettings(): DisplayScaleSettings {
  const defaultPpi = getDefaultDisplayPpi()
  const defaultCardWidth = cardWidthFromPpi(defaultPpi)
  const next: DisplayScaleSettings = {
    screenPpi: defaultPpi,
    cardWidthPx: defaultCardWidth,
    isCalibrated: false
  }
  displayScaleSettings.set(next)
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(DISPLAY_SCALE_STORAGE_KEY)
  }
  return next
}

export {
  POPULAR_DISPLAY_PRESETS,
  DEFAULT_MOBILE_LOGICAL_DPI,
  detectMobileFrameDimensions,
  zoomForDevice,
  zoomForPhysical
}
