import { describe, expect, test } from 'bun:test'

import { SceneGraph } from '@openweave/scene-graph'

import {
  deleteSharedLibrary,
  ensureLibraryComponentInDocument,
  ensureLibraryStyleInDocument,
  exportLibraryJson,
  getSharedLibrary,
  importLibraryJson,
  listSharedLibraries,
  publishComponentsToLibrary,
  publishDesignSystem,
  saveSharedLibrary
} from '@/app/libraries/library-store'

describe('shared libraries service', () => {
  test('publishes components to a library and restores them into a document', () => {
    const graphA = new SceneGraph()
    const pageAId = graphA.getPages()[0].id
    const buttonComp = graphA.createNode('COMPONENT', pageAId, {
      name: 'Primary Button',
      componentKey: 'comp-btn-1'
    })
    const textNode = graphA.createNode('TEXT', buttonComp.id, {
      name: 'Label',
      text: 'Click me'
    })

    // Publish to a shared library
    const library = publishComponentsToLibrary((id) => graphA.getNode(id), [buttonComp.id], {
      name: 'Core UI',
      version: '1.2.0',
      description: 'Design system buttons'
    })

    expect(library.name).toBe('Core UI')
    expect(library.version).toBe('1.2.0')
    expect(library.components.length).toBe(1)
    expect(library.components[0].name).toBe('Primary Button')
    expect(library.components[0].key).toBe('comp-btn-1')

    // Export and import JSON
    const exportedJson = exportLibraryJson(library.id)
    expect(exportedJson).not.toBeNull()
    if (exportedJson) {
      const imported = importLibraryJson(exportedJson)
      expect(imported).not.toBeNull()
      expect(imported?.name).toBe('Core UI')
    }

    // Restore into document B
    const graphB = new SceneGraph()
    const pageBId = graphB.getPages()[0].id

    const restoredId = ensureLibraryComponentInDocument(
      {
        getAllNodes: () => [...graphB.nodes.values()],
        getNode: (id) => graphB.getNode(id),
        setNode: (node) => {
          graphB.nodes.set(node.id, node)
        },
        currentPageId: pageBId
      },
      library.id,
      library.components[0]
    )

    const restoredComp = graphB.getNode(restoredId)
    expect(restoredComp).toBeDefined()
    expect(restoredComp?.name).toBe('Primary Button')
    expect(restoredComp?.sourceLibraryKey).toBe(library.id)
    expect(restoredComp?.childIds.length).toBe(1)

    const restoredText = graphB.getNode(restoredComp?.childIds[0] ?? '')
    expect(restoredText?.type).toBe('TEXT')
    expect(restoredText?.text).toBe('Click me')

    // Calling ensureLibraryComponentInDocument again should reuse the existing component
    const secondCallId = ensureLibraryComponentInDocument(
      {
        getAllNodes: () => [...graphB.nodes.values()],
        getNode: (id) => graphB.getNode(id),
        setNode: (node) => {
          graphB.nodes.set(node.id, node)
        },
        currentPageId: pageBId
      },
      library.id,
      library.components[0]
    )
    expect(secondCallId).toBe(restoredId)

    // Cleanup
    deleteSharedLibrary(library.id)
  })

  test('publishes styles to a library, exports/imports JSON, and restores into a document', () => {
    const graphA = new SceneGraph()
    const pageAId = graphA.getPages()[0].id

    graphA.createNode('RECTANGLE', pageAId, {
      name: 'Brand Primary',
      sharedStyleType: 'FILL',
      internalOnly: true,
      source: { id: 'style_brand_primary', name: 'Brand Primary' },
      fills: [
        {
          type: 'SOLID',
          color: { r: 0.1, g: 0.5, b: 0.9, a: 1 },
          opacity: 1,
          visible: true
        }
      ]
    })

    const library = publishDesignSystem(
      (id) => graphA.getNode(id),
      graphA.nodes.values(),
      [],
      ['style_brand_primary'],
      {
        name: 'Brand Tokens',
        version: '2.0.0',
        description: 'Brand color and typography tokens'
      }
    )

    expect(library.name).toBe('Brand Tokens')
    expect(library.version).toBe('2.0.0')
    expect(library.styles?.length).toBe(1)
    expect(library.styles?.[0].name).toBe('Brand Primary')
    expect(library.styles?.[0].type).toBe('FILL')
    expect(library.styles?.[0].id).toBe('style_brand_primary')

    const exportedJson = exportLibraryJson(library.id)
    expect(exportedJson).not.toBeNull()
    if (exportedJson) {
      const imported = importLibraryJson(exportedJson)
      expect(imported).not.toBeNull()
      expect(imported?.styles?.length).toBe(1)
      expect(imported?.styles?.[0].name).toBe('Brand Primary')
    }

    const graphB = new SceneGraph()
    const pageBId = graphB.getPages()[0].id

    const restoredStyleId = ensureLibraryStyleInDocument(
      {
        getAllNodes: () => [...graphB.nodes.values()],
        getNode: (id) => graphB.getNode(id),
        setNode: (node) => {
          graphB.nodes.set(node.id, node)
        },
        currentPageId: pageBId
      },
      library.id,
      library.styles![0]
    )

    expect(restoredStyleId).toBeDefined()
    const restoredNode = [...graphB.nodes.values()].find(
      (n) => n.sharedStyleType === 'FILL' && n.source?.id === restoredStyleId
    )
    expect(restoredNode).toBeDefined()
    expect(restoredNode?.name).toBe('Brand Primary')
    expect(restoredNode?.sourceLibraryKey).toBe(library.id)
    expect(restoredNode?.fills?.[0]?.color).toEqual({ r: 0.1, g: 0.5, b: 0.9, a: 1 })

    const secondCallId = ensureLibraryStyleInDocument(
      {
        getAllNodes: () => [...graphB.nodes.values()],
        getNode: (id) => graphB.getNode(id),
        setNode: (node) => {
          graphB.nodes.set(node.id, node)
        },
        currentPageId: pageBId
      },
      library.id,
      library.styles![0]
    )
    expect(secondCallId).toBe(restoredStyleId)

    deleteSharedLibrary(library.id)
  })

  test('caches listSharedLibraries result for useSyncExternalStore stability', () => {
    const first = listSharedLibraries()
    const second = listSharedLibraries()
    expect(first).toBe(second)
  })
})
