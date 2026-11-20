/**
 * Wire protocol for the desktop collab relay.
 *
 * The desktop app hosts a WebSocket relay next to the files it serves to the
 * ngrok share tunnel, so collaboration only needs that one tunnel: no public
 * signaling brokers, STUN servers, or WebRTC NAT traversal. Shared by the
 * Electron main process (server) and the renderer (client); keep it free of
 * DOM and Node APIs.
 *
 * Control messages are JSON text frames. Data frames are binary:
 * `[u8 actionLength][action][u8 peerLength][peer][payload]`, where `peer` is
 * the target on the way in (empty = broadcast) and the sender on the way out.
 */

export const COLLAB_RELAY_PATH = '/collab'
export const COLLAB_RELAY_HEALTH_PATH = '/collab/health'
/** Full-state sync replies carry embedded images, so allow large frames. */
export const COLLAB_RELAY_MAX_PAYLOAD = 256 * 1024 * 1024
export const COLLAB_RELAY_MAX_PEERS = 32
export const COLLAB_RELAY_HELLO_TIMEOUT_MS = 10_000

export const RELAY_CLOSE_CODES = {
  badHello: 4400,
  unauthorized: 4401,
  roomNotFound: 4404,
  roomFull: 4429
} as const

export type RelayCloseReason = keyof typeof RELAY_CLOSE_CODES

const ROOM_ID_PATTERN = /^[a-z0-9-]{1,64}$/
const PASSWORD_HASH_PATTERN = /^[0-9a-f]{64}$/

export interface RelayClientHello {
  type: 'hello'
  roomId: string
  /** SHA-256 hex of the room password (see `hashRoomPassword`), or `null`. */
  passwordHash: string | null
  /** Only the desktop host's own window holds this; it may create rooms. */
  hostToken?: string
}

export type RelayServerMessage =
  | { type: 'welcome'; peerId: string; peers: string[] }
  | { type: 'join'; peerId: string }
  | { type: 'leave'; peerId: string }

/** Untrusted JSON before validation. */
interface RawRelayHello {
  type?: unknown
  roomId?: unknown
  passwordHash?: unknown
  hostToken?: unknown
}

interface RawRelayServerMessage {
  type?: unknown
  peerId?: unknown
  peers?: unknown
}

export interface RelayFrame {
  action: string
  peerId: string
  payload: Uint8Array
}

export function relayCloseReason(code: number): RelayCloseReason | null {
  for (const [reason, value] of Object.entries(RELAY_CLOSE_CODES)) {
    if (value === code) return reason as RelayCloseReason
  }
  return null
}

export function parseRelayHello(raw: string): RelayClientHello | null {
  let value: unknown
  try {
    value = JSON.parse(raw)
  } catch {
    return null
  }
  if (!value || typeof value !== 'object') return null
  const hello = value as RawRelayHello
  if (hello.type !== 'hello') return null
  if (typeof hello.roomId !== 'string' || !ROOM_ID_PATTERN.test(hello.roomId)) return null
  const passwordHash = hello.passwordHash ?? null
  if (
    passwordHash !== null &&
    (typeof passwordHash !== 'string' || !PASSWORD_HASH_PATTERN.test(passwordHash))
  ) {
    return null
  }
  if (hello.hostToken !== undefined && typeof hello.hostToken !== 'string') return null
  return {
    type: 'hello',
    roomId: hello.roomId,
    passwordHash,
    hostToken: hello.hostToken
  }
}

export function parseRelayServerMessage(raw: string): RelayServerMessage | null {
  let value: unknown
  try {
    value = JSON.parse(raw)
  } catch {
    return null
  }
  if (!value || typeof value !== 'object') return null
  const message = value as RawRelayServerMessage
  if (typeof message.peerId !== 'string') return null
  if (message.type === 'welcome') {
    const peers = Array.isArray(message.peers)
      ? message.peers.filter((peer): peer is string => typeof peer === 'string')
      : []
    return { type: 'welcome', peerId: message.peerId, peers }
  }
  if (message.type === 'join' || message.type === 'leave') {
    return { type: message.type, peerId: message.peerId }
  }
  return null
}

const encoder = new TextEncoder()
const decoder = new TextDecoder()

export function encodeRelayFrame({ action, peerId, payload }: RelayFrame): Uint8Array<ArrayBuffer> {
  const actionBytes = encoder.encode(action)
  const peerBytes = encoder.encode(peerId)
  if (actionBytes.length > 255 || peerBytes.length > 255) {
    throw new Error('Relay action and peer ids must be at most 255 bytes')
  }
  const frame = new Uint8Array(2 + actionBytes.length + peerBytes.length + payload.length)
  let offset = 0
  frame[offset++] = actionBytes.length
  frame.set(actionBytes, offset)
  offset += actionBytes.length
  frame[offset++] = peerBytes.length
  frame.set(peerBytes, offset)
  offset += peerBytes.length
  frame.set(payload, offset)
  return frame
}

export function decodeRelayFrame(frame: Uint8Array): RelayFrame | null {
  if (frame.length < 2) return null
  const actionLength = frame[0] ?? 0
  const peerLengthIndex = 1 + actionLength
  if (actionLength === 0 || peerLengthIndex >= frame.length) return null
  const peerLength = frame[peerLengthIndex] ?? 0
  const payloadStart = peerLengthIndex + 1 + peerLength
  if (payloadStart > frame.length) return null
  return {
    action: decoder.decode(frame.subarray(1, peerLengthIndex)),
    peerId: decoder.decode(frame.subarray(peerLengthIndex + 1, payloadStart)),
    payload: frame.subarray(payloadStart)
  }
}
