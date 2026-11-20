import { createRelayRoom, type RelayEndpoint } from '@/app/collab/relay/client'
import { COLLAB_RELAY_HEALTH_PATH, COLLAB_RELAY_PATH } from '@/app/collab/relay/protocol'
import type { CollabTransportOptions, CollabTransportRoom } from '@/app/collab/transport/types'
import { getDesktopBridge } from '@/app/desktop/env'

export type { CollabTransportError, CollabTransportRoom } from '@/app/collab/transport/types'

const RELAY_PROBE_TIMEOUT_MS = 2500

/** `wss://host/collab` for an `https://host` share-link origin. */
export function relayUrlForOrigin(origin: string): string {
  const url = new URL(COLLAB_RELAY_PATH, origin)
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
  return url.toString()
}

/** True when `origin` is an OpenWeave desktop share server with a collab relay. */
export async function hasCollabRelay(origin: string): Promise<boolean> {
  try {
    const res = await fetch(new URL(COLLAB_RELAY_HEALTH_PATH, origin), {
      cache: 'no-store',
      // Skips ngrok's free-plan interstitial for this programmatic request.
      headers: { 'ngrok-skip-browser-warning': '1' },
      signal: AbortSignal.timeout(RELAY_PROBE_TIMEOUT_MS)
    })
    if (!res.ok) return false
    const body = (await res.json()) as { relay?: unknown }
    return body.relay === true
  } catch {
    return false
  }
}

/**
 * Forwards to a room that resolves later. Sends before it resolves are
 * dropped: no peers can be connected yet, matching a fresh room's behavior.
 */
function createDeferredRoom(pending: Promise<CollabTransportRoom>): CollabTransportRoom {
  let room: CollabTransportRoom | null = null
  let left = false
  const setup: Array<(target: CollabTransportRoom) => void> = []

  pending
    .then((resolved) => {
      if (left) {
        resolved.leave()
        return
      }
      room = resolved
      for (const apply of setup.splice(0)) apply(resolved)
    })
    .catch(() => {
      // The transport failed to load (e.g. a chunk fetch failed offline); the
      // session stays alone in the room rather than crashing.
    })

  const whenReady = (apply: (target: CollabTransportRoom) => void) => {
    if (room) apply(room)
    else setup.push(apply)
  }

  return {
    makeAction(name) {
      let send: ReturnType<CollabTransportRoom['makeAction']>[0] | null = null
      const receivers: Array<(data: Uint8Array, peerId: string) => void> = []
      whenReady((target) => {
        const [targetSend, targetReceive] = target.makeAction(name)
        send = targetSend
        targetReceive((data, peerId) => {
          for (const receiver of receivers) receiver(data, peerId)
        })
      })
      return [(data, peerId) => send?.(data, peerId), (handler) => void receivers.push(handler)]
    },
    onPeerJoin: (handler) => whenReady((target) => target.onPeerJoin(handler)),
    onPeerLeave: (handler) => whenReady((target) => target.onPeerLeave(handler)),
    leave() {
      left = true
      room?.leave()
    }
  }
}

/** Loads Trystero (and its MQTT client) only when the WebRTC fallback is used. */
async function loadTrysteroRoom(options: CollabTransportOptions): Promise<CollabTransportRoom> {
  const { createTrysteroRoom } = await import('@/app/collab/transport/trystero')
  return createTrysteroRoom(options)
}

function relayRoomAt(options: CollabTransportOptions, endpoint: RelayEndpoint) {
  return createRelayRoom({ ...options, resolveEndpoint: async () => endpoint })
}

/**
 * Picks the collab transport for a room:
 * 1. Joining another host's share link → that host's relay.
 * 2. Desktop app → its own loopback relay (works offline; ngrok shares it).
 * 3. Browser served by a desktop share server (an invitee) → same-origin relay.
 * 4. Anything else (static web hosting) → Trystero WebRTC.
 */
export function openCollabTransport(options: CollabTransportOptions): CollabTransportRoom {
  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : null
  const { hostOrigin } = options
  if (hostOrigin && hostOrigin !== currentOrigin) {
    return relayRoomAt(options, { url: relayUrlForOrigin(hostOrigin) })
  }

  const bridge = getDesktopBridge()
  if (bridge) {
    return createRelayRoom({ ...options, resolveEndpoint: () => bridge.collab.relayEndpoint() })
  }

  if (!currentOrigin || !/^https?:$/.test(window.location.protocol)) {
    return createDeferredRoom(loadTrysteroRoom(options))
  }
  return createDeferredRoom(
    hasCollabRelay(currentOrigin).then((relay) =>
      relay
        ? relayRoomAt(options, { url: relayUrlForOrigin(currentOrigin) })
        : loadTrysteroRoom(options)
    )
  )
}
