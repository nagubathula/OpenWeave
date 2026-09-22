import type { DeviceRotation, PrototypeDevice, SceneNode } from '@openweave/scene-graph'

export type DevicePresetId =
  | 'none'
  | 'iphone-16-pro'
  | 'iphone-16-pro-max'
  | 'google-pixel-9'
  | 'ipad-pro-11'
  | 'macbook-pro-16'

export type DeviceCutoutType = 'dynamic-island' | 'punch-hole' | 'notch' | 'none'

export interface DeviceSpec {
  id: DevicePresetId
  name: string
  width: number
  height: number
  screenRadius: number
  outerRadius: number
  bezel: {
    top: number
    bottom: number
    left: number
    right: number
  }
  cutout: {
    type: DeviceCutoutType
    width?: number
    height?: number
    top?: number
    radius?: number
  }
  hasHomeIndicator?: boolean
  platform: 'ios' | 'android' | 'macos' | 'generic'
}

export const DEVICE_SPECS: Record<DevicePresetId, DeviceSpec> = {
  none: {
    id: 'none',
    name: 'None (presentation)',
    width: 0,
    height: 0,
    screenRadius: 0,
    outerRadius: 0,
    bezel: { top: 0, bottom: 0, left: 0, right: 0 },
    cutout: { type: 'none' },
    platform: 'generic'
  },
  'iphone-16-pro': {
    id: 'iphone-16-pro',
    name: 'iPhone 16 & 15 Pro',
    width: 393,
    height: 852,
    screenRadius: 48,
    outerRadius: 54,
    bezel: { top: 12, bottom: 12, left: 12, right: 12 },
    cutout: { type: 'dynamic-island', width: 120, height: 35, top: 11, radius: 18 },
    hasHomeIndicator: true,
    platform: 'ios'
  },
  'iphone-16-pro-max': {
    id: 'iphone-16-pro-max',
    name: 'iPhone 16 & 17 Pro Max',
    width: 440,
    height: 956,
    screenRadius: 50,
    outerRadius: 56,
    bezel: { top: 12, bottom: 12, left: 12, right: 12 },
    cutout: { type: 'dynamic-island', width: 124, height: 36, top: 12, radius: 18 },
    hasHomeIndicator: true,
    platform: 'ios'
  },
  'google-pixel-9': {
    id: 'google-pixel-9',
    name: 'Google Pixel 9',
    width: 402,
    height: 874,
    screenRadius: 38,
    outerRadius: 44,
    bezel: { top: 10, bottom: 10, left: 10, right: 10 },
    cutout: { type: 'punch-hole', width: 14, height: 14, top: 12, radius: 7 },
    hasHomeIndicator: true,
    platform: 'android'
  },
  'ipad-pro-11': {
    id: 'ipad-pro-11',
    name: 'iPad Pro 11"',
    width: 834,
    height: 1194,
    screenRadius: 24,
    outerRadius: 28,
    bezel: { top: 18, bottom: 18, left: 18, right: 18 },
    cutout: { type: 'none' },
    hasHomeIndicator: true,
    platform: 'ios'
  },
  'macbook-pro-16': {
    id: 'macbook-pro-16',
    name: 'MacBook Pro 16"',
    width: 1728,
    height: 1117,
    screenRadius: 10,
    outerRadius: 16,
    bezel: { top: 16, bottom: 16, left: 12, right: 12 },
    cutout: { type: 'notch', width: 160, height: 26, top: 0, radius: 8 },
    hasHomeIndicator: false,
    platform: 'macos'
  }
}

export const DEVICE_PRESET_OPTIONS = [
  { value: 'none', label: 'None (custom frame)' },
  { value: 'iphone-16-pro', label: 'iPhone 16 & 15 Pro' },
  { value: 'iphone-16-pro-max', label: 'iPhone 16 Pro Max' },
  { value: 'google-pixel-9', label: 'Google Pixel 9' },
  { value: 'ipad-pro-11', label: 'iPad Pro 11"' },
  { value: 'macbook-pro-16', label: 'MacBook Pro 16"' }
]

/**
 * Resolve device mockup specification from prototype device settings or auto-match from frame dimensions.
 */
export function resolveDeviceSpec(
  device?: PrototypeDevice | null,
  frame?: SceneNode | null
): DeviceSpec | null {
  if (device?.type === 'NONE') return null
  if (device?.type === 'PRESET' && device.presetIdentifier) {
    const matched = DEVICE_SPECS[device.presetIdentifier as DevicePresetId]
    if (matched && matched.id !== 'none') return matched
  }

  // Auto-detect based on frame dimensions if no preset is explicitly set
  if (frame) {
    const w = frame.width
    const h = frame.height
    for (const spec of Object.values(DEVICE_SPECS)) {
      if (spec.id === 'none') continue
      if ((w === spec.width && h === spec.height) || (w === spec.height && h === spec.width)) {
        return spec
      }
    }
  }

  return null
}

export function computeDeviceOuterBounds(
  spec: DeviceSpec,
  screenWidth: number,
  screenHeight: number,
  rotation: DeviceRotation = 'NONE'
): { totalWidth: number; totalHeight: number } {
  const isLandscape = rotation === 'CCW_90'
  const b = spec.bezel
  const extraW = isLandscape ? b.top + b.bottom : b.left + b.right
  const extraH = isLandscape ? b.left + b.right : b.top + b.bottom

  return {
    totalWidth: screenWidth + extraW,
    totalHeight: screenHeight + extraH
  }
}
