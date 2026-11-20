import {
  decodeRelayFrame,
  encodeRelayFrame,
  parseRelayServerMessage,
  relayCloseReason,
  type RelayClientHello,
  type RelayCloseReason
} from '@/app/collab/relay/protocol'
import type {
  CollabTransportError,
  CollabTransportOptions,
  CollabTransportRoom
} from '@/app/collab/transport/types'

/**
 * WebSocket client for the desktop collab relay. Reconnects with backoff when
 * the socket drops (e.g. a tunnel hiccup); peers re-sync through the normal
 * join handshake. Fatal rejections (wrong password, unknown room) stop it.
 */

const RECONNECT_BASE_MS = 1000
const RECONNECT_MAX_MS = 10_000

export interface RelayEndpoint {
  url: string
  hostToken?: string
}

export interface RelayRoomOptions extends CollabTransportOptions {
  resolveEndpoint: () => Promise<RelayEndpoint>
}

const CLOSE_ERRORS: Record<RelayCloseReason, CollabTransportError> = {
  badHello: 'rejected',
  unauthorized: 'unauthorized',
  roomNotFound: 'room-not-found',
  roomFull: 'room-full'
}

/** Hashes the room password so it never crosses the tunnel in plain text. */
export async function hashRoomPassword(roomId: string, password: string): Promise<string> {
  const data = new TextEncoder().encode(`openweave-room:${roomId}:${password}`)
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', data))
  return Array.from(digest, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

export function createRelayRoom(options: RelayRoomOptions): CollabTransportRoom {
  const actions = new Map<string, Array<(data: Uint8Array, peerId: string) => void>>()
  const joinHandlers: Array<(peerId: string) => void> = []
  const leaveHandlers: Array<(peerId: string) => void> = []
  const peers = new Set<string>()
  let socket: WebSocket | null = null
  let welcomed = false
  let left = false
  let attempts = 0
  let retryTimer: ReturnType<typeof setTimeout> | null = null

  const emitJoin = (peerId: string) => {
    if (peers.has(peerId)) return
    peers.add(peerId)
    for (const handler of joinHandlers) handler(peerId)
  }
  const emitLeave = (peerId: string) => {
    if (!peers.delete(peerId)) return
    for (const handler of leaveHandlers) handler(peerId)
  }

  function handleControl(raw: string) {
    const message = parseRelayServerMessage(raw)
    if (!message) return
    if (message.type === 'welcome') {
      welcomed = true
      attempts = 0
      for (const peerId of message.peers) emitJoin(peerId)
    } else if (message.type === 'join') {
      emitJoin(message.peerId)
    } else {
      emitLeave(message.peerId)
    }
  }

  function handleFrame(data: ArrayBuffer) {
    const frame = decodeRelayFrame(new Uint8Array(data))
    if (!frame) return
    for (const handler of actions.get(frame.action) ?? []) handler(frame.payload, frame.peerId)
  }

  function scheduleReconnect() {
    if (left || retryTimer) return
    const delay = Math.min(RECONNECT_BASE_MS * 2 ** attempts, RECONNECT_MAX_MS)
    attempts += 1
    retryTimer = setTimeout(() => {
      retryTimer = null
      void connect()
    }, delay)
  }

  async function connect() {
    let endpoint: RelayEndpoint
    let passwordHash: string | null = null
    try {
      endpoint = await options.resolveEndpoint()
      const password = options.password?.trim()
      if (password) passwordHash = await hashRoomPassword(options.roomId, password)
    } catch {
      scheduleReconnect()
      return
    }
    if (left) return

    const ws = new WebSocket(endpoint.url)
    ws.binaryType = 'arraybuffer'
    socket = ws
    ws.addEventListener('open', () => {
      const hello: RelayClientHello = {
        type: 'hello',
        roomId: options.roomId,
        passwordHash,
        hostToken: endpoint.hostToken
      }
      ws.send(JSON.stringify(hello))
    })
    ws.addEventListener('message', (event: MessageEvent<string | ArrayBuffer>) => {
      if (typeof event.data === 'string') handleControl(event.data)
      else handleFrame(event.data)
    })
    ws.addEventListener('close', (event) => {
      if (socket === ws) socket = null
      welcomed = false
      for (const handler of leaveHandlers) {
        for (const peerId of peers) handler(peerId)
      }
      peers.clear()
      if (left) return
      const reason = relayCloseReason(event.code)
      if (reason) {
        left = true
        options.onError?.(CLOSE_ERRORS[reason])
        return
      }
      scheduleReconnect()
    })
  }

  void connect()

  return {
    makeAction(name) {
      const handlers = actions.get(name) ?? []
      actions.set(name, handlers)
      return [
        (data, peerId) => {
          if (!welcomed || socket?.readyState !== WebSocket.OPEN) return
          socket.send(encodeRelayFrame({ action: name, peerId: peerId ?? '', payload: data }))
        },
        (handler) => {
          handlers.push(handler)
        }
      ]
    },
    onPeerJoin: (handler) => {
      joinHandlers.push(handler)
    },
    onPeerLeave: (handler) => {
      leaveHandlers.push(handler)
    },
    leave() {
      left = true
      if (retryTimer) clearTimeout(retryTimer)
      retryTimer = null
      socket?.close(1000, 'leave')
      socket = null
      peers.clear()
    }
  }
}
