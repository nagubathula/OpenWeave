import { persistentAtom } from '@nanostores/persistent'
import { atom } from 'nanostores'

import { getDesktopBridge } from '@/app/desktop/env'
import type { DesktopShareTunnelErrorCode } from '@/app/desktop/types'

/**
 * ngrok share tunnel. The desktop app serves the editor and its collab relay
 * from one loopback server and tunnels it with the bundled ngrok SDK, so
 * invitees load the app and collaborate through the same public URL without
 * any other service.
 */

export type ShareTunnelErrorCode = DesktopShareTunnelErrorCode | 'unsupported'

export type ShareTunnelState =
  | { status: 'idle' }
  | { status: 'starting' }
  | { status: 'active'; url: string }
  | { status: 'error'; code: ShareTunnelErrorCode; error: string }

export const savedTunnelUrl = persistentAtom<string>('op-ngrok-url', '')

export const shareTunnelState = atom<ShareTunnelState>(
  savedTunnelUrl.get() ? { status: 'active', url: savedTunnelUrl.get() } : { status: 'idle' }
)

export function setCustomTunnelUrl(rawUrl: string): void {
  const url = rawUrl.trim()
  if (!url) {
    savedTunnelUrl.set('')
    shareTunnelState.set({ status: 'idle' })
    return
  }
  const clean = url.startsWith('http://') || url.startsWith('https://') ? url : `https://${url}`
  savedTunnelUrl.set(clean)
  shareTunnelState.set({ status: 'active', url: clean })
}

export function isDesktopAvailable(): boolean {
  return getDesktopBridge() !== null
}

export function getTunnelShareUrl(baseUrl: string, roomId: string, isProtected = false): string {
  return `${baseUrl.replace(/\/+$/, '')}/share?room=${roomId}${isProtected ? '&pwd=1' : ''}`
}

async function queryLocalNgrokApi(): Promise<string | null> {
  try {
    const res = await fetch('http://127.0.0.1:4040/api/tunnels', {
      signal: AbortSignal.timeout(1200)
    })
    if (!res.ok) return null
    const data = (await res.json()) as { tunnels?: Array<{ public_url?: string }> }
    const tunnel =
      data.tunnels?.find((t) => t.public_url?.startsWith('https://')) ?? data.tunnels?.[0]
    return tunnel?.public_url ?? null
  } catch {
    return null
  }
}

function desktopTunnel() {
  const bridge = getDesktopBridge()
  if (!bridge) throw new Error('Native desktop runtime not available')
  return bridge.tunnel
}

export async function startShareTunnel(): Promise<string | null> {
  const current = shareTunnelState.get()
  if (current.status === 'active') return current.url
  if (current.status === 'starting') return null

  shareTunnelState.set({ status: 'starting' })

  // Desktop: the main process tunnels its share server (app files + relay).
  // Any other local ngrok tunnel would not carry the relay, so don't adopt one.
  if (isDesktopAvailable()) {
    try {
      const result = await desktopTunnel().start()
      if (result.ok) {
        savedTunnelUrl.set(result.url)
        shareTunnelState.set({ status: 'active', url: result.url })
        return result.url
      }
      shareTunnelState.set({ status: 'error', code: result.code, error: result.message })
    } catch {
      shareTunnelState.set({
        status: 'error',
        code: 'failed',
        error: 'The ngrok tunnel could not be started.'
      })
    }
    return null
  }

  const localUrl = await queryLocalNgrokApi()
  if (localUrl) {
    shareTunnelState.set({ status: 'active', url: localUrl })
    return localUrl
  }
  shareTunnelState.set({
    status: 'error',
    code: 'unsupported',
    error: 'ngrok tunnel could not be started. Share from the OpenWeave desktop app.'
  })
  return null
}

export async function stopShareTunnel(): Promise<void> {
  savedTunnelUrl.set('')
  shareTunnelState.set({ status: 'idle' })
  if (isDesktopAvailable()) {
    try {
      await desktopTunnel().stop()
    } catch {
      // Already stopped.
    }
  }
}

/** Re-reads the tunnel state from the backend (e.g. after a webview reload). */
export async function syncShareTunnelStatus(): Promise<void> {
  const saved = savedTunnelUrl.get()
  if (saved) {
    shareTunnelState.set({ status: 'active', url: saved })
  }

  if (isDesktopAvailable()) {
    // The main process is authoritative: a URL saved by an earlier launch
    // forwarded a share server port that no longer exists.
    try {
      const url = await desktopTunnel().status()
      savedTunnelUrl.set(url ?? '')
      shareTunnelState.set(url ? { status: 'active', url } : { status: 'idle' })
    } catch {
      shareTunnelState.set({ status: 'idle' })
    }
    return
  }

  const localUrl = await queryLocalNgrokApi()
  if (localUrl) {
    savedTunnelUrl.set(localUrl)
    shareTunnelState.set({ status: 'active', url: localUrl })
  }
}
