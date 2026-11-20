/**
 * Minimal room contract the collab session needs from a transport. Both the
 * desktop relay client and the Trystero (WebRTC) fallback implement it.
 */

export type CollabSend = (data: Uint8Array, peerId?: string) => void
export type CollabReceive = (handler: (data: Uint8Array, peerId: string) => void) => void

export interface CollabTransportRoom {
  makeAction: (name: string) => [CollabSend, CollabReceive]
  onPeerJoin: (handler: (peerId: string) => void) => void
  onPeerLeave: (handler: (peerId: string) => void) => void
  leave: () => void
}

/** Fatal transport errors; the session disconnects when it receives one. */
export type CollabTransportError = 'unauthorized' | 'room-not-found' | 'room-full' | 'rejected'

export interface CollabTransportOptions {
  roomId: string
  password?: string
  /** Origin of the host's share link when joining another host's room. */
  hostOrigin?: string
  onError?: (error: CollabTransportError) => void
}
