import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import type { IncomingMessage } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { PassThrough } from 'node:stream'

import { createCollabRelay, createRelayOriginCheck } from '#desktop/collab-relay'
import { startShareServer, type ShareServer } from '#desktop/share-server'

import { createRelayRoom, hashRoomPassword } from '@/app/collab/relay/client'
import {
  decodeRelayFrame,
  encodeRelayFrame,
  parseRelayHello,
  relayCloseReason
} from '@/app/collab/relay/protocol'
import type { CollabTransportError, CollabTransportRoom } from '@/app/collab/transport/types'

const HOST_TOKEN = 'host-token-for-tests'

let root = ''
let share: ShareServer
let relayUrl = ''

async function waitFor(condition: () => boolean, timeoutMs = 3000) {
  const deadline = Date.now() + timeoutMs
  while (!condition()) {
    if (Date.now() > deadline) throw new Error('Timed out waiting for condition')
    await Bun.sleep(10)
  }
}

const settle = () => Bun.sleep(100)

function openRoom(options: {
  roomId: string
  password?: string
  host?: boolean
  onError?: (error: CollabTransportError) => void
}): CollabTransportRoom {
  return createRelayRoom({
    roomId: options.roomId,
    password: options.password,
    onError: options.onError,
    resolveEndpoint: async () => ({
      url: relayUrl,
      hostToken: options.host ? HOST_TOKEN : undefined
    })
  })
}

beforeAll(async () => {
  root = mkdtempSync(join(tmpdir(), 'openweave-share-'))
  writeFileSync(join(root, 'share.html'), '<h1>share</h1>')
  share = await startShareServer({
    distRoot: root,
    devOrigin: null,
    relay: createCollabRelay({ hostToken: HOST_TOKEN, isAllowedOrigin: () => true }),
    lanHost: '127.0.0.1'
  })
  relayUrl = `ws://127.0.0.1:${share.port}/collab`
})

afterAll(() => {
  share.close()
  rmSync(root, { recursive: true, force: true })
})

describe('relay protocol', () => {
  test('round-trips data frames', () => {
    const payload = new Uint8Array([1, 2, 3, 250])
    const frame = decodeRelayFrame(
      encodeRelayFrame({ action: 'yjs-update', peerId: 'p1', payload })
    )
    expect(frame?.action).toBe('yjs-update')
    expect(frame?.peerId).toBe('p1')
    expect([...(frame?.payload ?? [])]).toEqual([...payload])
  })

  test('rejects malformed frames and hellos', () => {
    expect(decodeRelayFrame(new Uint8Array([0]))).toBeNull()
    expect(decodeRelayFrame(new Uint8Array([5, 97]))).toBeNull()
    expect(parseRelayHello('not json')).toBeNull()
    expect(parseRelayHello(JSON.stringify({ type: 'hello', roomId: '../x' }))).toBeNull()
    expect(
      parseRelayHello(JSON.stringify({ type: 'hello', roomId: 'abc', passwordHash: 'plain' }))
    ).toBeNull()
    expect(parseRelayHello(JSON.stringify({ type: 'hello', roomId: 'abc' }))).toEqual({
      type: 'hello',
      roomId: 'abc',
      passwordHash: null,
      hostToken: undefined
    })
    expect(relayCloseReason(4401)).toBe('unauthorized')
    expect(relayCloseReason(1006)).toBeNull()
  })

  test('hashes passwords per room', async () => {
    const a = await hashRoomPassword('room1', 'secret')
    expect(a).toMatch(/^[0-9a-f]{64}$/)
    expect(await hashRoomPassword('room2', 'secret')).not.toBe(a)
  })
})

describe('relay origin check', () => {
  const check = createRelayOriginCheck(['app://openweave'])

  test('accepts trusted and same-origin requests', () => {
    expect(check('app://openweave', '127.0.0.1:5000')).toBe(true)
    expect(check('https://abc.ngrok-free.app', 'abc.ngrok-free.app')).toBe(true)
  })

  test('rejects foreign or missing origins', () => {
    expect(check('https://evil.example', 'abc.ngrok-free.app')).toBe(false)
    expect(check(undefined, 'abc.ngrok-free.app')).toBe(false)
  })

  test('refuses relay upgrades from foreign origins and ignores other paths', () => {
    const relay = createCollabRelay({
      hostToken: HOST_TOKEN,
      isAllowedOrigin: createRelayOriginCheck(['app://openweave'])
    })
    let written = ''
    const socket = new PassThrough()
    socket.on('data', (chunk: Buffer) => {
      written += chunk.toString()
    })
    const request = {
      url: '/collab',
      headers: { origin: 'https://evil.example', host: 'abc.ngrok-free.app' }
    } as IncomingMessage
    expect(relay.handleUpgrade(request, socket, Buffer.alloc(0))).toBe(true)
    expect(written.startsWith('HTTP/1.1 403 Forbidden')).toBe(true)

    const hmr = { ...request, url: '/_next/webpack-hmr' } as IncomingMessage
    expect(relay.handleUpgrade(hmr, new PassThrough(), Buffer.alloc(0))).toBe(false)
    relay.close()
  })
})

describe('share server', () => {
  test('advertises the relay and serves app files', async () => {
    const health = await fetch(`http://127.0.0.1:${share.port}/collab/health`)
    expect(await health.json()).toEqual({ relay: true })
    const page = await fetch(`http://127.0.0.1:${share.port}/share`)
    expect(await page.text()).toBe('<h1>share</h1>')
  })

  test('serves the same app and relay on a LAN listener until stopped', async () => {
    expect(share.lanPort()).toBeNull()
    const lanPort = await share.startLan()
    expect(await share.startLan()).toBe(lanPort)
    expect(lanPort).not.toBe(share.port)
    expect(share.lanPort()).toBe(lanPort)

    const health = await fetch(`http://127.0.0.1:${lanPort}/collab/health`)
    expect(await health.json()).toEqual({ relay: true })
    const page = await fetch(`http://127.0.0.1:${lanPort}/share`)
    expect(await page.text()).toBe('<h1>share</h1>')

    share.stopLan()
    expect(share.lanPort()).toBeNull()
    await expect(fetch(`http://127.0.0.1:${lanPort}/collab/health`)).rejects.toThrow()
  })
})

describe('relay rooms', () => {
  test('relays broadcast and targeted frames between host and invitees', async () => {
    const host = openRoom({ roomId: 'room-a', password: 'pw', host: true })
    const hostPeers: string[] = []
    const hostLeft: string[] = []
    host.onPeerJoin((peerId) => hostPeers.push(peerId))
    host.onPeerLeave((peerId) => hostLeft.push(peerId))
    const [hostSend, hostReceive] = host.makeAction('yjs-update')
    const hostGot: Array<{ data: number[]; from: string }> = []
    hostReceive((data, from) => hostGot.push({ data: [...data], from }))
    // Let the host open the room before the invitee joins it.
    await settle()

    const guest = openRoom({ roomId: 'room-a', password: 'pw' })
    const guestPeers: string[] = []
    guest.onPeerJoin((peerId) => guestPeers.push(peerId))
    const [guestSend, guestReceive] = guest.makeAction('yjs-update')
    const guestGot: number[][] = []
    guestReceive((data) => guestGot.push([...data]))

    await waitFor(() => hostPeers.length === 1 && guestPeers.length === 1)

    guestSend(new Uint8Array([7, 8, 9]))
    await waitFor(() => hostGot.length === 1)
    expect(hostGot[0]).toEqual({ data: [7, 8, 9], from: hostPeers[0] })

    // hostPeers[0] is the guest's id as the host sees it.
    hostSend(new Uint8Array([4, 2]), hostPeers[0])
    await waitFor(() => guestGot.length === 1)
    expect(guestGot[0]).toEqual([4, 2])

    guest.leave()
    await waitFor(() => hostLeft.length === 1)
    host.leave()
  })

  test('reports unknown rooms and wrong passwords', async () => {
    const errors: CollabTransportError[] = []
    const stray = openRoom({ roomId: 'missing', onError: (error) => errors.push(error) })
    await waitFor(() => errors.length === 1)
    expect(errors[0]).toBe('room-not-found')
    stray.leave()

    const host = openRoom({ roomId: 'room-b', password: 'right', host: true })
    await settle()
    const intruder = openRoom({
      roomId: 'room-b',
      password: 'wrong',
      onError: (error) => errors.push(error)
    })
    await waitFor(() => errors.length === 2)
    expect(errors[1]).toBe('unauthorized')
    intruder.leave()
    host.leave()
  })
})
