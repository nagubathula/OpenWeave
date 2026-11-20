import { atom } from 'nanostores'

import { getDesktopBridge } from '@/app/desktop/env'
import type { DesktopLocalShare } from '@/app/desktop/types'

/**
 * Desktop "share locally": the app's share server also listens on the local
 * network, so links like `http://192.168.1.20:52341/share?room=…` work for
 * anyone on the same network without internet or ngrok.
 */

export type LocalShare = DesktopLocalShare

export const localShareState = atom<LocalShare | null>(null)

export async function startLocalShare(): Promise<LocalShare | null> {
  const bridge = getDesktopBridge()
  if (!bridge) return null
  try {
    const share = await bridge.collab.startLocalShare()
    localShareState.set(share)
    return share
  } catch (error) {
    console.warn('Failed to start local network sharing', error)
    return null
  }
}

export async function stopLocalShare(): Promise<void> {
  localShareState.set(null)
  await getDesktopBridge()?.collab.stopLocalShare()
}

/** Re-reads the local share after a webview reload (the main process keeps it). */
export async function syncLocalShareStatus(): Promise<void> {
  const bridge = getDesktopBridge()
  if (!bridge) return
  localShareState.set(await bridge.collab.localShareStatus())
}
