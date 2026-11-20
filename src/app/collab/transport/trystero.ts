import { joinRoom } from 'trystero/mqtt'

import type { CollabTransportOptions, CollabTransportRoom } from '@/app/collab/transport/types'
import { TRYSTERO_APP_ID } from '@/constants'

/**
 * WebRTC fallback for rooms not hosted by an OpenWeave desktop relay (e.g. the
 * web app on a static host). Needs public MQTT brokers for signaling and STUN
 * for NAT traversal, so it does not work offline.
 */
export function createTrysteroRoom({
  roomId,
  password
}: CollabTransportOptions): CollabTransportRoom {
  const room = joinRoom(
    {
      appId: TRYSTERO_APP_ID,
      password: password?.trim() || undefined,
      relayUrls: ['wss://broker.hivemq.com:8884/mqtt', 'wss://test.mosquitto.org:8081/mqtt'],
      rtcConfig: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' },
          { urls: 'stun:stun.cloudflare.com:3478' }
        ]
      }
    },
    roomId
  )

  return {
    makeAction(name) {
      const [send, receive] = room.makeAction<Uint8Array>(name)
      return [
        (data, peerId) => void (peerId ? send(data, peerId) : send(data)),
        (handler) => receive((data, peerId) => handler(new Uint8Array(data), peerId))
      ]
    },
    onPeerJoin: (handler) => room.onPeerJoin(handler),
    onPeerLeave: (handler) => room.onPeerLeave(handler),
    leave: () => void room.leave()
  }
}
