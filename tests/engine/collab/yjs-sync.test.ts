import { describe, test, expect } from 'bun:test'

import * as Y from 'yjs'

import type { Fill, GeometryPath, SceneNode } from '@openweave/scene-graph'
import { SceneGraph } from '@openweave/scene-graph'
import { nodeVisualBounds } from '@openweave/scene-graph/geometry'

import {
  createYjsGraphSync,
  registerYjsObservers,
  syncNodePropsToYMap,
  yNodeToProps
} from '@/app/collab/yjs-sync'
import { createEditorStore } from '@/app/editor/session'

import { expectDefined, getNodeOrThrow } from '#tests/helpers/assert'
import { connectYDocs } from '#tests/helpers/yjs'

// Test copy of the private apply path.
function applyYnodeToGraph(peer: SceneGraph, nodeId: string, ynode: Y.Map<unknown>) {
  const props = yNodeToProps(ynode)
  if (peer.getNode(nodeId)) {
    peer.updateNode(nodeId, props as Partial<SceneNode>)
    return
  }
  const type = props.type as SceneNode['type'] | undefined
  if (!type) return
  const parentId = typeof props.parentId === 'string' ? props.parentId : null
  peer.createNodeWithId(nodeId, type, parentId, props as Partial<SceneNode>)
  if (parentId === null) peer.rootId = nodeId
}

function seedHostIntoYjs(host: SceneGraph): Y.Map<Y.Map<unknown>> {
  const doc = new Y.Doc()
  const ynodes = doc.getMap<Y.Map<unknown>>('nodes')
  doc.transact(() => {
    for (const node of host.getAllNodes()) {
      const ynode = new Y.Map<unknown>()
      ynodes.set(node.id, ynode)
      syncNodePropsToYMap(node, ynode)
    }
  })
  return ynodes
}

function firstPage(graph: SceneGraph): SceneNode {
  return expectDefined(graph.getPages()[0], 'first page')
}

type SyncedStores = ReturnType<typeof createSyncedStores>

function createSyncedStores() {
  const hostStore = createEditorStore(new SceneGraph())
  const peerStore = createEditorStore(new SceneGraph())
  const hostDoc = new Y.Doc()
  const peerDoc = new Y.Doc()
  const hostNodes = hostDoc.getMap<Y.Map<unknown>>('nodes')
  const peerNodes = peerDoc.getMap<Y.Map<unknown>>('nodes')
  const hostImages = hostDoc.getMap<Uint8Array>('images')
  const peerImages = peerDoc.getMap<Uint8Array>('images')
  let hostSuppressYjsEvents = false
  let peerSuppressYjsEvents = false
  let hostSuppressGraphSync = false
  let peerSuppressGraphSync = false

  const hostSync = createYjsGraphSync({
    getStore: () => hostStore,
    getYdoc: () => hostDoc,
    getYnodes: () => hostNodes,
    getYimages: () => hostImages,
    setSuppressYjsEvents: (value) => {
      hostSuppressYjsEvents = value
    }
  })
  const peerSync = createYjsGraphSync({
    getStore: () => peerStore,
    getYdoc: () => peerDoc,
    getYnodes: () => peerNodes,
    getYimages: () => peerImages,
    setSuppressYjsEvents: (value) => {
      peerSuppressYjsEvents = value
    }
  })

  registerYjsObservers({
    store: hostStore,
    ynodes: hostNodes,
    yimages: hostImages,
    getSuppressYjsEvents: () => hostSuppressYjsEvents,
    setSuppressGraphSync: (value) => {
      hostSuppressGraphSync = value
    },
    applyYjsToGraph: hostSync.applyYjsToGraph
  })
  registerYjsObservers({
    store: peerStore,
    ynodes: peerNodes,
    yimages: peerImages,
    getSuppressYjsEvents: () => peerSuppressYjsEvents,
    setSuppressGraphSync: (value) => {
      peerSuppressGraphSync = value
    },
    applyYjsToGraph: peerSync.applyYjsToGraph
  })

  const disconnectYDocs = connectYDocs(hostDoc, peerDoc)

  return {
    hostStore,
    peerStore,
    hostSync,
    peerSync,
    get hostSuppressGraphSync() {
      return hostSuppressGraphSync
    },
    get peerSuppressGraphSync() {
      return peerSuppressGraphSync
    },
    cleanup: () => {
      disconnectYDocs()
      hostDoc.destroy()
      peerDoc.destroy()
    }
  }
}

function withSyncedStores(run: (stores: SyncedStores) => void) {
  const stores = createSyncedStores()
  try {
    run(stores)
  } finally {
    stores.cleanup()
  }
}

describe('collab yjs-sync', () => {
  test('createNodeWithId forces the requested id even if synced props contain a stale id', () => {
    const graph = new SceneGraph()
    const page = firstPage(graph)
    const node = graph.createNodeWithId('remote-id', 'RECTANGLE', page.id, {
      id: 'stale-local-id',
      width: 50
    })

    expect(node.id).toBe('remote-id')
    expect(graph.getNode('remote-id')).toBe(node)
    expect(graph.getNode('stale-local-id')).toBeUndefined()
    expect(page.childIds).toContain('remote-id')
  })

  test('binary geometry fields round-trip as Uint8Array, not strings', () => {
    const host = new SceneGraph()
    const page = firstPage(host)
    const blob = new Uint8Array([1, 2, 3, 250])
    const geometry: GeometryPath[] = [{ windingRule: 'NONZERO', commandsBlob: blob }]
    const ellipse = host.createNode('ELLIPSE', page.id, {
      width: 100,
      height: 100,
      fillGeometry: geometry
    })

    const doc = new Y.Doc()
    const ynode = new Y.Map<unknown>()
    doc.getMap<Y.Map<unknown>>('nodes').set(ellipse.id, ynode)
    syncNodePropsToYMap(ellipse, ynode)
    blob[0] = 99
    const props = yNodeToProps(ynode)

    expect(typeof ynode.get('fillGeometry')).not.toBe('string')
    const decoded = props.fillGeometry as GeometryPath[]
    expect(Array.isArray(decoded)).toBe(true)
    const commandsBlob = expectDefined(decoded[0], 'decoded geometry path').commandsBlob
    expect(commandsBlob).toBeInstanceOf(Uint8Array)
    expect(Array.from(commandsBlob)).toEqual([1, 2, 3, 250])
    expect(Array.isArray(props.strokeGeometry)).toBe(true)
  })

  test('a fresh peer reconstructs one ellipse, no duplicate childIds, order-independent', () => {
    const host = new SceneGraph()
    const hostPage = firstPage(host)
    const ellipse = host.createNode('ELLIPSE', hostPage.id, { width: 80, height: 60 })

    const ynodes = seedHostIntoYjs(host)

    const peer = new SceneGraph()
    const ids = [...ynodes.keys()].reverse()
    for (const id of ids) applyYnodeToGraph(peer, id, expectDefined(ynodes.get(id), `ynode ${id}`))

    const peerEllipse = getNodeOrThrow(peer, ellipse.id)
    expect(peerEllipse.type).toBe('ELLIPSE')
    expect(peerEllipse.parentId).toBe(hostPage.id)

    const peerPage = getNodeOrThrow(peer, hostPage.id)
    const refs = peerPage.childIds.filter((c) => c === ellipse.id)
    expect(refs).toHaveLength(1)
    expect(peer.getPages().map((page) => page.id)).toContain(hostPage.id)
  })

  test('a live-created node links into its parent even when the parent childIds was not re-synced', () => {
    const host = new SceneGraph()
    const hostPage = firstPage(host)
    const rect = host.createNode('RECTANGLE', hostPage.id, { width: 50, height: 50 })

    const doc = new Y.Doc()
    const ynodes = doc.getMap<Y.Map<unknown>>('nodes')
    doc.transact(() => {
      const pageYnode = new Y.Map<unknown>()
      ynodes.set(hostPage.id, pageYnode)
      syncNodePropsToYMap({ ...hostPage, childIds: [] } as SceneNode, pageYnode)

      const rectYnode = new Y.Map<unknown>()
      ynodes.set(rect.id, rectYnode)
      syncNodePropsToYMap(rect, rectYnode)
    })

    const peer = new SceneGraph()
    applyYnodeToGraph(peer, hostPage.id, expectDefined(ynodes.get(hostPage.id), 'page ynode'))
    applyYnodeToGraph(peer, rect.id, expectDefined(ynodes.get(rect.id), 'rect ynode'))

    const peerPage = getNodeOrThrow(peer, hostPage.id)
    expect(peerPage.childIds).toEqual([rect.id])
    expect(getNodeOrThrow(peer, rect.id).type).toBe('RECTANGLE')
  })

  test('syncAllNodesToYjs populates peer graph and current page', () => {
    withSyncedStores(({ hostStore, peerStore, hostSync }) => {
      const hostPage = firstPage(hostStore.graph)
      const rect = hostStore.graph.createNode('RECTANGLE', hostPage.id, { width: 80, height: 60 })

      hostSync.syncAllNodesToYjs()

      expect(peerStore.graph.rootId).toBe(hostStore.graph.rootId)
      expect(peerStore.state.currentPageId).toBe(hostPage.id)
      expect(peerStore.graph.getPages().map((page) => page.id)).toContain(hostPage.id)
      expect(getNodeOrThrow(peerStore.graph, rect.id).type).toBe('RECTANGLE')
    })
  })

  test('a large multi-page document with images reaches the peer in one initial sync', () => {
    withSyncedStores(({ hostStore, peerStore, hostSync }) => {
      const graph = hostStore.graph
      const pages = [firstPage(graph), graph.addPage('Page 2'), graph.addPage('Page 3')]
      const image = new Uint8Array(4 * 1024 * 1024).fill(7)
      graph.images.set('hash-big', image)
      for (const page of pages) {
        for (let screen = 0; screen < 40; screen++) {
          const frame = graph.createNode('FRAME', page.id, { name: `screen-${screen}` })
          for (let layer = 0; layer < 10; layer++) {
            graph.createNode('RECTANGLE', frame.id, { x: layer * 10, width: 8, height: 8 })
          }
        }
      }
      const imageLayer = graph.createNode('RECTANGLE', pages[0].id, { name: 'image' })
      graph.updateNode(imageLayer.id, {
        fills: [
          { type: 'IMAGE', imageHash: 'hash-big', scaleMode: 'FILL', visible: true, opacity: 1 }
        ] as Fill[]
      })

      hostSync.syncAllNodesToYjs()

      expect(peerStore.graph.getPages().map((page) => page.name)).toEqual([
        'Page 1',
        'Page 2',
        'Page 3'
      ])
      expect(peerStore.graph.getAllNodes().length).toBe(graph.getAllNodes().length)
      expect(peerStore.graph.images.get('hash-big')?.byteLength).toBe(image.byteLength)
    })
  })

  test('a node that fails to apply does not block the rest of the sync', () => {
    withSyncedStores(({ hostStore, peerStore, hostSync }) => {
      const hostPage = firstPage(hostStore.graph)
      const bad = hostStore.graph.createNode('RECTANGLE', hostPage.id, { name: 'bad' })
      const good = hostStore.graph.createNode('RECTANGLE', hostPage.id, { name: 'good' })
      const createNodeWithId = peerStore.graph.createNodeWithId.bind(peerStore.graph)
      peerStore.graph.createNodeWithId = (id, ...rest) => {
        if (id === bad.id) throw new Error('malformed node')
        return createNodeWithId(id, ...rest)
      }
      const originalError = console.error
      console.error = () => {}
      try {
        hostSync.syncAllNodesToYjs()
      } finally {
        console.error = originalError
      }

      expect(peerStore.graph.getNode(bad.id)).toBeUndefined()
      expect(getNodeOrThrow(peerStore.graph, good.id).name).toBe('good')
    })
  })

  test('re-syncing a node writes only the properties that changed', () => {
    const graph = new SceneGraph()
    const rect = graph.createNode('RECTANGLE', firstPage(graph).id, { width: 50, height: 50 })
    const doc = new Y.Doc()
    const ynode = new Y.Map<unknown>()
    doc.getMap<Y.Map<unknown>>('nodes').set(rect.id, ynode)
    syncNodePropsToYMap(rect, ynode)

    let changed: string[] = []
    ynode.observe((event) => changed.push(...event.keysChanged))
    graph.updateNode(rect.id, { x: 12 })
    syncNodePropsToYMap(getNodeOrThrow(graph, rect.id), ynode)
    expect(changed).toContain('x')
    for (const untouched of ['width', 'height', 'fills', 'strokes', 'name', 'childIds']) {
      expect(changed).not.toContain(untouched)
    }

    changed = []
    syncNodePropsToYMap(getNodeOrThrow(graph, rect.id), ynode)
    expect(changed).toEqual([])
  })

  test('live-created and edited nodes sync in both directions', () => {
    withSyncedStores(({ hostStore, peerStore, hostSync, peerSync }) => {
      const hostPage = firstPage(hostStore.graph)
      hostSync.syncAllNodesToYjs()

      const rect = hostStore.graph.createNode('RECTANGLE', hostPage.id, { width: 50, height: 50 })
      hostSync.syncNodeToYjs(rect.id)

      const peerRect = getNodeOrThrow(peerStore.graph, rect.id)
      expect(peerRect.parentId).toBe(hostPage.id)
      expect(getNodeOrThrow(peerStore.graph, hostPage.id).childIds).toContain(rect.id)

      peerStore.graph.updateNode(rect.id, { x: 42, y: 24 })
      peerSync.syncNodeToYjs(rect.id)

      expect(getNodeOrThrow(hostStore.graph, rect.id).x).toBe(42)
      expect(getNodeOrThrow(hostStore.graph, rect.id).y).toBe(24)
    })
  })

  test('image fills sync image bytes', () => {
    withSyncedStores(({ hostStore, peerStore, hostSync }) => {
      const hostPage = firstPage(hostStore.graph)
      const imageHash = 'image-hash'
      const imageFill: Fill = {
        type: 'IMAGE',
        color: { r: 0, g: 0, b: 0, a: 1 },
        opacity: 1,
        visible: true,
        imageHash,
        imageScaleMode: 'FILL'
      }
      const rect = hostStore.graph.createNode('RECTANGLE', hostPage.id, { fills: [imageFill] })
      hostStore.graph.images.set(imageHash, new Uint8Array([9, 8, 7]))

      hostSync.syncNodeToYjs(rect.id)

      expect(
        Array.from(expectDefined(peerStore.graph.images.get(imageHash), 'peer image'))
      ).toEqual([9, 8, 7])
    })
  })

  test('synced node does not crash the visual-bounds helper', () => {
    const host = new SceneGraph()
    const hostPage = firstPage(host)
    const ellipse = host.createNode('ELLIPSE', hostPage.id, { width: 120, height: 90 })

    const ynodes = seedHostIntoYjs(host)
    const peer = new SceneGraph()
    for (const id of ynodes.keys()) {
      applyYnodeToGraph(peer, id, expectDefined(ynodes.get(id), `ynode ${id}`))
    }

    const peerEllipse = getNodeOrThrow(peer, ellipse.id)
    expect(() =>
      nodeVisualBounds(peerEllipse, (id) => {
        const n = peer.getNode(id)
        return { x: n?.x ?? 0, y: n?.y ?? 0 }
      })
    ).not.toThrow()
  })
})
