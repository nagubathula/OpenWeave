import type { DesktopBridge } from '@/app/desktop/types'

type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? Partial<T[K]> : T[K] }

/**
 * Installs a partial `window.electron` desktop bridge for engine tests, so
 * `getDesktopBridge()` / `isDesktop()` take the desktop code paths.
 */
export function installDesktopBridgeMock(bridge: DeepPartial<DesktopBridge>) {
  const existing = 'window' in globalThis ? (globalThis as { window: object }).window : {}
  Object.assign(globalThis, { window: { ...existing, electron: { isElectron: true, ...bridge } } })
}

export function clearDesktopMocks() {
  Reflect.deleteProperty(globalThis, 'window')
}
