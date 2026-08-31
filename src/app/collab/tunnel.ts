import { atom } from 'nanostores'

import { IS_TAURI } from '@/constants'

/**
 * ngrok share tunnel (Tauri only). Collaboration is P2P (Trystero/WebRTC), so
 * the hosted web app's only role is delivering the editor to invitees. The
 * desktop app can serve its own bundled frontend through an ngrok ephemeral
 * URL instead, so sharing works without the hosted domain.
 */

export type ShareTunnelState =
  | { status: 'idle' }
  | { status: 'starting' }
  | { status: 'active'; url: string }
  | { status: 'error'; error: string }

export const shareTunnelState = atom<ShareTunnelState>({ status: 'idle' })

export function getTunnelShareUrl(baseUrl: string, roomId: string): string {
  return `${baseUrl.replace(/\/+$/, '')}/share?room=${roomId}`
}

async function tauriInvoke<T>(command: string): Promise<T> {
  const { invoke } = await import('@tauri-apps/api/core')
  return invoke<T>(command)
}

export async function startShareTunnel(): Promise<string | null> {
  if (!IS_TAURI) return null
  const current = shareTunnelState.get()
  if (current.status === 'active') return current.url
  if (current.status === 'starting') return null
  shareTunnelState.set({ status: 'starting' })
  try {
    const { url } = await tauriInvoke<{ url: string }>('start_share_tunnel')
    shareTunnelState.set({ status: 'active', url })
    return url
  } catch (error) {
    shareTunnelState.set({ status: 'error', error: String(error) })
    return null
  }
}

export async function stopShareTunnel(): Promise<void> {
  if (!IS_TAURI) return
  shareTunnelState.set({ status: 'idle' })
  try {
    await tauriInvoke('stop_share_tunnel')
  } catch {
    // Already stopped.
  }
}

/** Re-reads the tunnel state from the backend (e.g. after a webview reload). */
export async function syncShareTunnelStatus(): Promise<void> {
  if (!IS_TAURI || shareTunnelState.get().status !== 'idle') return
  try {
    const url = await tauriInvoke<string | null>('share_tunnel_status')
    if (url) shareTunnelState.set({ status: 'active', url })
  } catch {
    // Backend without tunnel support; leave idle.
  }
}
