import * as awarenessProtocol from 'y-protocols/awareness'
import * as Y from 'yjs'

import {
  openCollabTransport,
  type CollabTransportError,
  type CollabTransportRoom
} from '@/app/collab/transport'

type CollabRoomOptions = {
  roomId: string
  password?: string
  hostOrigin?: string
  onError?: (error: CollabTransportError) => void
  ydoc: Y.Doc
  awareness: awarenessProtocol.Awareness
  setConnected: () => void
  updatePeersList: () => void
}

export type CollabRoomConnection = {
  room: CollabTransportRoom
  sendYjsUpdate: (data: Uint8Array, peerId?: string) => void
  sendAwareness: (data: Uint8Array, peerId?: string) => void
  sendSyncStep1: (data: Uint8Array, peerId?: string) => void
}

export function connectCollabRoom({
  roomId,
  password,
  hostOrigin,
  onError,
  ydoc,
  awareness,
  setConnected,
  updatePeersList
}: CollabRoomOptions): CollabRoomConnection {
  const room = openCollabTransport({ roomId, password, hostOrigin, onError })

  const [sendYjsUpdate, getUpdate] = room.makeAction('yjs-update')
  const [sendAwareness, getAw] = room.makeAction('awareness')
  const [sendSyncStep1, getSync] = room.makeAction('sync-step1')
  const [sendSyncReply, getSyncReply] = room.makeAction('sync-reply')

  getUpdate((data) => {
    Y.applyUpdate(ydoc, new Uint8Array(data), 'remote')
  })

  getAw((data) => {
    awarenessProtocol.applyAwarenessUpdate(awareness, new Uint8Array(data), null)
  })

  getSync((data, peerId) => {
    const sv = new Uint8Array(data)
    const update = Y.encodeStateAsUpdate(ydoc, sv)
    sendSyncReply(update, peerId)
  })

  getSyncReply((data) => {
    Y.applyUpdate(ydoc, new Uint8Array(data), 'remote')
  })

  ydoc.on('update', (update: Uint8Array, origin: unknown) => {
    if (origin === 'remote') return
    sendYjsUpdate(update)
  })

  awareness.on(
    'update',
    ({ added, updated, removed }: { added: number[]; updated: number[]; removed: number[] }) => {
      const changedClients = [...added, ...updated, ...removed]
      const encodedUpdate = awarenessProtocol.encodeAwarenessUpdate(awareness, changedClients)
      sendAwareness(encodedUpdate)
    }
  )

  room.onPeerJoin((peerId) => {
    setConnected()
    const sv = Y.encodeStateVector(ydoc)
    sendSyncStep1(sv, peerId)

    const encodedUpdate = awarenessProtocol.encodeAwarenessUpdate(awareness, [awareness.clientID])
    sendAwareness(encodedUpdate, peerId)
  })

  room.onPeerLeave(() => {
    const remoteClients = [...awareness.getStates().keys()].filter(
      (id) => id !== awareness.clientID
    )
    awarenessProtocol.removeAwarenessStates(awareness, remoteClients, 'peer-left')
    updatePeersList()
  })

  return { room, sendYjsUpdate, sendAwareness, sendSyncStep1 }
}
