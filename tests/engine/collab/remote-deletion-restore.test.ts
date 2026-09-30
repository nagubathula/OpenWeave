import { describe, expect, test } from 'bun:test'

import * as Y from 'yjs'

import type { SceneNode } from '@openweave/scene-graph'

import { createCollabRuntime } from '@/app/collab/session'
import { createYjsGraphSync, registerYjsObservers } from '@/app/collab/yjs-sync'
import { createEditorStore } from '@/app/editor/session'

describe('Collaborative Remote Deletion Safeguards', () => {
  test('captures remotely deleted node and provides restore callback', () => {
    const store = createEditorStore()
    const ydoc = new Y.Doc()
    const ynodes = ydoc.getMap<Y.Map<unknown>>('nodes')
    const yimages = ydoc.getMap<Uint8Array>('images')
    const runtime = createCollabRuntime()
    runtime.ydoc = ydoc
    runtime.ynodes = ynodes
    runtime.yimages = yimages

    let capturedNode: SceneNode | null = null
    let restoreFn: (() => void) | null = null

    const { syncNodeToYjs, applyYjsToGraph } = createYjsGraphSync({
      getStore: () => store,
      getYdoc: () => ydoc,
      getYnodes: () => ynodes,
      getYimages: () => yimages,
      setSuppressYjsEvents: (v) => {
        runtime.suppressYjsEvents = v
      },
      onRemoteNodeDeleted: (node, restore) => {
        capturedNode = node
        restoreFn = restore
      }
    })

    registerYjsObservers({
      store,
      ynodes,
      yimages,
      getSuppressYjsEvents: () => runtime.suppressYjsEvents,
      setSuppressGraphSync: (v) => {
        runtime.suppressGraphSync = v
      },
      applyYjsToGraph
    })

    // 1. Create a rectangle on the canvas
    const rectId = store.createShape('RECTANGLE', 20, 30, 150, 80)
    const originalNode = store.graph.getNode(rectId)
    expect(originalNode).toBeDefined()

    // Sync to Yjs
    syncNodeToYjs(rectId)
    expect(ynodes.has(rectId)).toBe(true)

    // 2. Simulate remote collaborator deleting the rectangle
    ydoc.transact(() => {
      ynodes.delete(rectId)
    })

    // Node should be removed from local graph, but captured in callback
    expect(store.graph.getNode(rectId)).toBeUndefined()
    expect(capturedNode).not.toBeNull()
    expect(capturedNode?.id).toBe(rectId)
    expect(capturedNode?.x).toBe(20)
    expect(capturedNode?.y).toBe(30)
    expect(restoreFn).not.toBeNull()

    // 3. User clicks [Restore]
    restoreFn?.()

    // Node should be restored in graph with exact geometry and re-synced to Yjs
    const restoredNode = store.graph.getNode(rectId)
    expect(restoredNode).toBeDefined()
    expect(restoredNode?.x).toBe(20)
    expect(restoredNode?.y).toBe(30)
    expect(restoredNode?.width).toBe(150)
    expect(restoredNode?.height).toBe(80)
    expect(ynodes.has(rectId)).toBe(true)
  })
})
