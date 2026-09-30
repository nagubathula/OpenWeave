import type { SceneNode } from '@openweave/scene-graph'

/**
 * ISO/IEC 7810 ID-1 standard dimensions for credit cards, debit cards,
 * driver's licenses, transit cards, and gift cards.
 */
export const CREDIT_CARD_WIDTH_MM = 85.6
export const CREDIT_CARD_HEIGHT_MM = 53.98
export const CREDIT_CARD_WIDTH_INCHES = 3.37007874
export const CREDIT_CARD_HEIGHT_INCHES = 2.12519685
export const CREDIT_CARD_CORNER_RADIUS_MM = 3.18
export const CREDIT_CARD_ASPECT_RATIO = CREDIT_CARD_WIDTH_MM / CREDIT_CARD_HEIGHT_MM // ~1.58577

/** Standard CSS resolution: 1 inch = 96 CSS pixels */
export const STANDARD_CSS_PPI = 96
/** Standard print resolution: 1 inch = 72 points */
export const STANDARD_PRINT_DPI = 72
/** Standard modern smartphone logical density: ~154.5 CSS pt / inch (e.g. iPhone 15/16 Pro) */
export const DEFAULT_MOBILE_LOGICAL_DPI = 154.5

export interface DisplayPreset {
  id: string
  name: string
  category: 'laptop' | 'desktop' | 'standard'
  ppi: number
  description: string
}

export const POPULAR_DISPLAY_PRESETS: readonly DisplayPreset[] = [
  {
    id: 'laptop-15-fhd-125',
    name: '15.6" Laptop 1080p (125% Scale)',
    category: 'laptop',
    ppi: 113,
    description: '1920 × 1080 at recommended 125% Windows scaling (~113 CSS PPI)'
  },
  {
    id: 'laptop-15-fhd-100',
    name: '15.6" Laptop 1080p (100% Native)',
    category: 'laptop',
    ppi: 141,
    description: '1920 × 1080 at 100% native scaling (141 PPI)'
  },
  {
    id: 'laptop-14-fhd-125',
    name: '14" Laptop 1080p (125% Scale)',
    category: 'laptop',
    ppi: 126,
    description: '1920 × 1080 at recommended 125% Windows scaling (~126 CSS PPI)'
  },
  {
    id: 'laptop-14-2k8-200',
    name: '14" Laptop 2.8K OLED (200% Scale)',
    category: 'laptop',
    ppi: 121,
    description: '2880 × 1800 at recommended 200% Windows scaling (~121 CSS PPI)'
  },
  {
    id: 'macbook-14-16',
    name: 'MacBook Pro 14" / 16" (Liquid Retina XDR)',
    category: 'laptop',
    ppi: 127,
    description: 'Default 2x display scaling (~127 CSS PPI / 254 physical PPI)'
  },
  {
    id: 'macbook-air-13',
    name: 'MacBook Air 13" / 15" (Retina)',
    category: 'laptop',
    ppi: 128,
    description: 'Default 2x display scaling (~128 CSS PPI / 256 physical PPI)'
  },
  {
    id: 'desktop-1080p-24',
    name: '24" 1080p Full HD Monitor',
    category: 'desktop',
    ppi: 92,
    description: '1920 × 1080 at 100% scaling (~92 PPI)'
  },
  {
    id: 'desktop-1440p-27',
    name: '27" 1440p QHD Monitor',
    category: 'desktop',
    ppi: 109,
    description: '2560 × 1440 at 100% scaling (~109 PPI)'
  },
  {
    id: 'desktop-4k-27-150',
    name: '27" 4K Monitor (150% Scaling)',
    category: 'desktop',
    ppi: 109,
    description: '3840 × 2160 at recommended 150% OS scaling (~109 CSS PPI)'
  },
  {
    id: 'desktop-4k-27-native',
    name: '27" 4K Monitor (100% Native)',
    category: 'desktop',
    ppi: 163,
    description: '3840 × 2160 at 100% unscaled (163 PPI)'
  },
  {
    id: 'desktop-4k-32-150',
    name: '32" 4K Monitor (150% Scaling)',
    category: 'desktop',
    ppi: 92,
    description: '3840 × 2160 at 150% OS scaling (~92 CSS PPI)'
  },
  {
    id: 'standard-css',
    name: 'Standard CSS Display (96 PPI)',
    category: 'standard',
    ppi: 96,
    description: 'W3C Standard 96 CSS pixels per inch'
  }
]

/**
 * Calculates CSS (logical) PPI given physical screen specs and OS scale factor.
 */
export function calculatePpiFromSpecs(
  diagonalInches: number,
  widthPx: number,
  heightPx: number,
  scalingPercent = 100
): number {
  if (diagonalInches <= 0 || widthPx <= 0 || heightPx <= 0 || scalingPercent <= 0) {
    return STANDARD_CSS_PPI
  }
  const diagonalPx = Math.hypot(widthPx, heightPx)
  const physicalPpi = diagonalPx / diagonalInches
  const logicalPpi = physicalPpi / (scalingPercent / 100)
  return Math.round(logicalPpi * 10) / 10
}

export interface DisplayScaleSettings {
  screenPpi: number
  cardWidthPx: number
  isCalibrated: boolean
  lastCalibratedAt?: number
  presetId?: string
}

export function ppiFromCardWidth(cardWidthPx: number): number {
  return Math.round((cardWidthPx / CREDIT_CARD_WIDTH_INCHES) * 10) / 10
}

export function cardWidthFromPpi(ppi: number): number {
  return Math.round(ppi * CREDIT_CARD_WIDTH_INCHES)
}

export function zoomForPhysical(screenPpi: number, targetDpi = STANDARD_CSS_PPI): number {
  if (screenPpi <= 0 || targetDpi <= 0) return 1
  return screenPpi / targetDpi
}

export function zoomForDevice(
  screenPpi: number,
  frameWidth: number,
  physicalWidthMm?: number
): number {
  if (screenPpi <= 0 || frameWidth <= 0) return 1
  if (physicalWidthMm && physicalWidthMm > 0) {
    const physicalWidthInches = physicalWidthMm / 25.4
    const deviceLogicalDpi = frameWidth / physicalWidthInches
    return screenPpi / deviceLogicalDpi
  }
  return screenPpi / DEFAULT_MOBILE_LOGICAL_DPI
}

export interface DetectedMobileDimensions {
  isMobile: boolean
  deviceLabel: string
  physicalWidthMm: number
  logicalPpi: number
}

/**
 * Detects whether a node is a mobile frame and resolves its physical screen width.
 */
export function detectMobileFrameDimensions(node?: SceneNode | null): DetectedMobileDimensions {
  if (!node || node.type !== 'FRAME') {
    return {
      isMobile: false,
      deviceLabel: 'Generic Mobile Screen',
      physicalWidthMm: 65,
      logicalPpi: DEFAULT_MOBILE_LOGICAL_DPI
    }
  }

  const w = Math.min(node.width, node.height)
  const h = Math.max(node.width, node.height)

  // iPhone 16 / 15 Pro (393 × 852)
  if (w === 393 && h === 852) {
    return {
      isMobile: true,
      deviceLabel: 'iPhone 16 / 15 Pro',
      physicalWidthMm: 64.6,
      logicalPpi: 393 / (64.6 / 25.4)
    }
  }

  // iPhone 16 / 17 Pro Max (440 × 956)
  if (w === 440 && h === 956) {
    return {
      isMobile: true,
      deviceLabel: 'iPhone 16 Pro Max',
      physicalWidthMm: 71.0,
      logicalPpi: 440 / (71.0 / 25.4)
    }
  }

  // iPhone 13 / 14 (390 × 844)
  if (w === 390 && h === 844) {
    return {
      isMobile: true,
      deviceLabel: 'iPhone 13 / 14',
      physicalWidthMm: 64.6,
      logicalPpi: 390 / (64.6 / 25.4)
    }
  }

  // Google Pixel 9 / iPhone 17 (402 × 874)
  if (w === 402 && h === 874) {
    return {
      isMobile: true,
      deviceLabel: 'Google Pixel 9',
      physicalWidthMm: 65.5,
      logicalPpi: 402 / (65.5 / 25.4)
    }
  }

  // Android Compact (412 × 917)
  if (w === 412 && (h === 915 || h === 917)) {
    return {
      isMobile: true,
      deviceLabel: 'Android Compact (Pixel)',
      physicalWidthMm: 66.0,
      logicalPpi: 412 / (66.0 / 25.4)
    }
  }

  // Generic mobile check: width typically 320px to 480px, aspect ratio > 1.6
  if (w >= 320 && w <= 480 && h / w >= 1.6) {
    return {
      isMobile: true,
      deviceLabel: node.name || 'Mobile Screen',
      physicalWidthMm: 65.0,
      logicalPpi: w / (65.0 / 25.4)
    }
  }

  return {
    isMobile: false,
    deviceLabel: node.name || 'Standard Frame',
    physicalWidthMm: (w / STANDARD_CSS_PPI) * 25.4,
    logicalPpi: STANDARD_CSS_PPI
  }
}
