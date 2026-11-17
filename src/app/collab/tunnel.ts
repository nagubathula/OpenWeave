import { persistentAtom } from '@nanostores/persistent'
import { atom } from 'nanostores'

import { getDesktopBridge } from '@/app/desktop/env'

/**
 * ngrok share tunnel. Collaboration is P2P (Trystero/WebRTC), so
 * the hosted web app's only role is delivering the editor to invitees. The
 * desktop or local server can serve through an ngrok ephemeral URL instead,
 * so sharing works without a public domain.
 */

export type ShareTunnelState =
  | { status: 'idle' }
  | { status: 'starting' }
  | { status: 'active'; url: string }
  | { status: 'error'; error: string }

export const savedTunnelUrl = persistentAtom<string>(
  'op-ngrok-url',
  'https://smoked-puritan-swarm.ngrok-free.dev'
)

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

  // 1. Try native desktop backend (Electron main process)
  if (isDesktopAvailable()) {
    try {
      const { url } = await desktopTunnel().start()
      if (url) {
        shareTunnelState.set({ status: 'active', url })
        return url
      }
    } catch {
      // Fall through to check direct 4040 API before reporting error
    }
  }

  // 2. Try direct local ngrok API (e.g. if running in browser or already spawned)
  const localUrl = await queryLocalNgrokApi()
  if (localUrl) {
    shareTunnelState.set({ status: 'active', url: localUrl })
    return localUrl
  }

  shareTunnelState.set({
    status: 'error',
    error:
      'ngrok tunnel could not be started. Ensure ngrok is installed or run "ngrok http 1420" in terminal.'
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
    try {
      const url = await desktopTunnel().status()
      if (url) {
        savedTunnelUrl.set(url)
        shareTunnelState.set({ status: 'active', url })
        return
      }
    } catch {
      // Fall through
    }
  }

  const localUrl = await queryLocalNgrokApi()
  if (localUrl) {
    savedTunnelUrl.set(localUrl)
    shareTunnelState.set({ status: 'active', url: localUrl })
  }
}
