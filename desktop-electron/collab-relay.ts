import { randomBytes, timingSafeEqual } from 'node:crypto'
import type { IncomingMessage } from 'node:http'
import type { Duplex } from 'node:stream'

import { WebSocket, WebSocketServer, type RawData } from 'ws'

import {
  COLLAB_RELAY_HELLO_TIMEOUT_MS,
  COLLAB_RELAY_MAX_PAYLOAD,
  COLLAB_RELAY_MAX_PEERS,
  COLLAB_RELAY_PATH,
  RELAY_CLOSE_CODES,
  decodeRelayFrame,
  encodeRelayFrame,
  parseRelayHello,
  type RelayServerMessage
} from '../src/app/collab/relay/protocol'

/**
 * Collab relay hosted by the desktop app. Peers in a room exchange Yjs and
 * awareness frames through this process, which the ngrok share tunnel exposes
 * alongside the app files. Only the host window (holding `hostToken`) may open
 * a room; invitees can join an open room when they know its id and password.
 */

const HEARTBEAT_INTERVAL_MS = 30_000
const MAX_MISSED_HEARTBEATS = 2

export interface CollabRelayOptions {
  hostToken: string
  /** Browser `Origin` check for the upgrade request; `host` is its `Host` header. */
  isAllowedOrigin: (origin: string | undefined, host: string | undefined) => boolean
  maxPeersPerRoom?: number
  /** Ping interval; idle peers that miss a pong are dropped. Overridable for tests. */
  heartbeatIntervalMs?: number
}

export interface CollabRelay {
  /** Handles `/collab` upgrades; returns `false` for other paths. */
  handleUpgrade: (request: IncomingMessage, socket: Duplex, head: Buffer) => boolean
  roomCount: () => number
  close: () => void
}

interface RelayRoom {
  passwordHash: string | null
  peers: Map<string, WebSocket>
}

/**
 * Accepts the app's own windows (`trustedOrigins`: the host and other
 * OpenWeave desktop apps joining through a share link) and same-origin pages,
 * i.e. invitees loading the editor from the tunnel.
 */
export function createRelayOriginCheck(trustedOrigins: string[]) {
  return (origin: string | undefined, host: string | undefined): boolean => {
    if (!origin) return false
    if (trustedOrigins.includes(origin)) return true
    try {
      return new URL(origin).host === host
    } catch {
      return false
    }
  }
}

function tokensMatch(expected: string, received: string | undefined): boolean {
  if (!received) return false
  const a = Buffer.from(expected)
  const b = Buffer.from(received)
  return a.length === b.length && timingSafeEqual(a, b)
}

function toBytes(data: RawData): Uint8Array {
  if (Array.isArray(data)) return new Uint8Array(Buffer.concat(data))
  if (data instanceof ArrayBuffer) return new Uint8Array(data)
  return new Uint8Array(data.buffer, data.byteOffset, data.byteLength)
}

function sendControl(socket: WebSocket, message: RelayServerMessage) {
  if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(message))
}

function rejectUpgrade(socket: Duplex, status: number, message: string) {
  socket.end(`HTTP/1.1 ${status} ${message}\r\nConnection: close\r\nContent-Length: 0\r\n\r\n`)
}

export function createCollabRelay(options: CollabRelayOptions): CollabRelay {
  const maxPeers = options.maxPeersPerRoom ?? COLLAB_RELAY_MAX_PEERS
  const rooms = new Map<string, RelayRoom>()
  /** Heartbeats each peer has missed while idle; reset by any sign of life. */
  const missed = new WeakMap<WebSocket, number>()
  const wss = new WebSocketServer({ noServer: true, maxPayload: COLLAB_RELAY_MAX_PAYLOAD })

  const heartbeat = setInterval(() => {
    for (const socket of wss.clients) {
      // A peer still downloading a large message (e.g. a big document's
      // initial sync over a slow tunnel) can't answer: our ping is queued
      // behind that message. Busy is not dead, so the count only grows while
      // nothing is waiting to be sent, and the peer gets a second idle interval
      // to drain what already left this process.
      const count = socket.bufferedAmount > 0 ? 0 : (missed.get(socket) ?? 0) + 1
      if (count > MAX_MISSED_HEARTBEATS) {
        socket.terminate()
        continue
      }
      missed.set(socket, count)
      socket.ping()
    }
  }, options.heartbeatIntervalMs ?? HEARTBEAT_INTERVAL_MS)
  heartbeat.unref()

  function joinRoom(socket: WebSocket, roomId: string, room: RelayRoom) {
    const peerId = randomBytes(8).toString('hex')
    const existing = [...room.peers.keys()]
    for (const peer of room.peers.values()) sendControl(peer, { type: 'join', peerId })
    room.peers.set(peerId, socket)
    sendControl(socket, { type: 'welcome', peerId, peers: existing })

    socket.on('message', (data, isBinary) => {
      if (!isBinary) return
      const frame = decodeRelayFrame(toBytes(data))
      if (!frame) return
      const outgoing = encodeRelayFrame({ ...frame, peerId })
      if (frame.peerId) {
        const target = room.peers.get(frame.peerId)
        if (target?.readyState === WebSocket.OPEN) target.send(outgoing)
        return
      }
      for (const [id, peer] of room.peers) {
        if (id !== peerId && peer.readyState === WebSocket.OPEN) peer.send(outgoing)
      }
    })

    socket.on('close', () => {
      room.peers.delete(peerId)
      for (const peer of room.peers.values()) sendControl(peer, { type: 'leave', peerId })
      if (room.peers.size === 0 && rooms.get(roomId) === room) rooms.delete(roomId)
    })
  }

  wss.on('connection', (socket: WebSocket) => {
    const markAlive = () => missed.set(socket, 0)
    markAlive()
    socket.on('pong', markAlive)
    // Incoming traffic proves the peer is alive even before its pong arrives.
    socket.on('message', markAlive)
    socket.on('error', () => socket.terminate())

    const helloTimeout = setTimeout(
      () => socket.close(RELAY_CLOSE_CODES.badHello, 'hello timeout'),
      COLLAB_RELAY_HELLO_TIMEOUT_MS
    )
    socket.once('close', () => clearTimeout(helloTimeout))
    socket.once('message', (data, isBinary) => {
      clearTimeout(helloTimeout)
      const hello = isBinary ? null : parseRelayHello(Buffer.from(toBytes(data)).toString('utf8'))
      if (!hello) {
        socket.close(RELAY_CLOSE_CODES.badHello, 'invalid hello')
        return
      }
      const isHost = tokensMatch(options.hostToken, hello.hostToken)
      let room = rooms.get(hello.roomId)
      if (!room) {
        if (!isHost) {
          socket.close(RELAY_CLOSE_CODES.roomNotFound, 'room not found')
          return
        }
        room = { passwordHash: hello.passwordHash, peers: new Map() }
        rooms.set(hello.roomId, room)
      } else if (room.passwordHash !== hello.passwordHash) {
        socket.close(RELAY_CLOSE_CODES.unauthorized, 'wrong password')
        return
      }
      if (room.peers.size >= maxPeers) {
        socket.close(RELAY_CLOSE_CODES.roomFull, 'room full')
        return
      }
      joinRoom(socket, hello.roomId, room)
    })
  })

  return {
    handleUpgrade(request, socket, head) {
      const pathname = new URL(request.url ?? '/', 'http://localhost').pathname
      if (pathname !== COLLAB_RELAY_PATH) return false
      if (!options.isAllowedOrigin(request.headers.origin, request.headers.host)) {
        rejectUpgrade(socket, 403, 'Forbidden')
        return true
      }
      wss.handleUpgrade(request, socket, head, (ws) => wss.emit('connection', ws, request))
      return true
    },
    roomCount: () => rooms.size,
    close() {
      clearInterval(heartbeat)
      for (const socket of wss.clients) socket.terminate()
      rooms.clear()
      wss.close()
    }
  }
}
