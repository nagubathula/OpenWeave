import { describe, expect, it } from 'bun:test'

import { importClipboardNodes } from '@openweave/core'
import type { NodeChange } from '@openweave/core'

import { getNodeOrThrow } from '#tests/helpers/assert'
import { createClipboardGraph } from '#tests/helpers/clipboard'

describe('importClipboardNodes: variables', () => {
  it('imports variable collections and variable entries into graph', () => {
    const { graph, pageId } = createClipboardGraph()

    const nodeChanges = [
      { guid: { sessionID: 0, localID: 0 }, type: 'DOCUMENT', name: 'Document' },
      {
        guid: { sessionID: 0, localID: 1 },
        parentIndex: { guid: { sessionID: 0, localID: 0 }, position: '!' },
        type: 'CANVAS',
        name: 'Page 1'
      },
      {
        guid: { sessionID: 0, localID: 2 },
        parentIndex: { guid: { sessionID: 0, localID: 1 }, position: '!' },
        type: 'VARIABLE_SET',
        name: 'Theme',
        variableSetModes: [
          { id: { sessionID: 0, localID: 100 }, name: 'Light' },
          { id: { sessionID: 0, localID: 101 }, name: 'Dark' }
        ]
      },
      {
        guid: { sessionID: 0, localID: 3 },
        parentIndex: { guid: { sessionID: 0, localID: 2 }, position: '!' },
        type: 'VARIABLE',
        name: 'Colors/Brand',
        variableSetID: { guid: { sessionID: 0, localID: 2 } },
        variableResolvedType: 'COLOR',
        variableDataValues: {
          entries: [
            {
              modeID: { sessionID: 0, localID: 100 },
              variableData: {
                dataType: 'COLOR',
                value: { colorValue: { r: 0.2, g: 0.4, b: 0.8, a: 1 } }
              }
            },
            {
              modeID: { sessionID: 0, localID: 101 },
              variableData: {
                dataType: 'COLOR',
                value: { colorValue: { r: 0.1, g: 0.2, b: 0.5, a: 1 } }
              }
            }
          ]
        }
      },
      {
        guid: { sessionID: 0, localID: 4 },
        parentIndex: { guid: { sessionID: 0, localID: 2 }, position: '"' },
        type: 'VARIABLE',
        name: 'Spacing/Base',
        variableSetID: { guid: { sessionID: 0, localID: 2 } },
        variableResolvedType: 'FLOAT',
        variableDataValues: {
          entries: [
            {
              modeID: { sessionID: 0, localID: 100 },
              variableData: {
                dataType: 'FLOAT',
                value: { floatValue: 16 }
              }
            }
          ]
        }
      },
      {
        guid: { sessionID: 0, localID: 10 },
        parentIndex: { guid: { sessionID: 0, localID: 1 }, position: '"' },
        type: 'FRAME',
        name: 'Box',
        size: { x: 100, y: 100 },
        transform: { m00: 1, m01: 0, m02: 0, m10: 0, m11: 1, m12: 0 }
      }
    ] as NodeChange[]

    const created = importClipboardNodes(nodeChanges, graph, pageId)
    expect(created).toHaveLength(1)

    // Collection imported
    const collection = graph.variableCollections.get('0:2')
    expect(collection).toBeDefined()
    expect(collection?.name).toBe('Theme')
    expect(collection?.modes).toEqual([
      { modeId: '0:100', name: 'Light' },
      { modeId: '0:101', name: 'Dark' }
    ])
    expect(collection?.defaultModeId).toBe('0:100')
    expect(collection?.variableIds).toContain('0:3')
    expect(collection?.variableIds).toContain('0:4')

    // Color variable imported
    const colorVar = graph.variables.get('0:3')
    expect(colorVar).toBeDefined()
    expect(colorVar?.name).toBe('Colors/Brand')
    expect(colorVar?.type).toBe('COLOR')
    expect(colorVar?.collectionId).toBe('0:2')
    expect(colorVar?.valuesByMode['0:100']).toEqual({ r: 0.2, g: 0.4, b: 0.8, a: 1 })
    expect(colorVar?.valuesByMode['0:101']).toEqual({ r: 0.1, g: 0.2, b: 0.5, a: 1 })

    // Float variable imported
    const floatVar = graph.variables.get('0:4')
    expect(floatVar).toBeDefined()
    expect(floatVar?.name).toBe('Spacing/Base')
    expect(floatVar?.type).toBe('FLOAT')
    expect(floatVar?.valuesByMode['0:100']).toBe(16)
  })

  it('binds variables to node properties and resolves values', () => {
    const { graph, pageId } = createClipboardGraph()

    const nodeChanges = [
      { guid: { sessionID: 0, localID: 0 }, type: 'DOCUMENT', name: 'Document' },
      {
        guid: { sessionID: 0, localID: 1 },
        parentIndex: { guid: { sessionID: 0, localID: 0 }, position: '!' },
        type: 'CANVAS',
        name: 'Page 1'
      },
      {
        guid: { sessionID: 0, localID: 2 },
        parentIndex: { guid: { sessionID: 0, localID: 1 }, position: '!' },
        type: 'VARIABLE_SET',
        name: 'Tokens',
        variableSetModes: [{ id: { sessionID: 0, localID: 100 }, name: 'Default' }]
      },
      {
        guid: { sessionID: 0, localID: 3 },
        parentIndex: { guid: { sessionID: 0, localID: 2 }, position: '!' },
        type: 'VARIABLE',
        name: 'Background',
        variableSetID: { guid: { sessionID: 0, localID: 2 } },
        variableResolvedType: 'COLOR',
        variableDataValues: {
          entries: [
            {
              modeID: { sessionID: 0, localID: 100 },
              variableData: {
                dataType: 'COLOR',
                value: { colorValue: { r: 1, g: 0, b: 0, a: 1 } }
              }
            }
          ]
        }
      },
      {
        guid: { sessionID: 0, localID: 4 },
        parentIndex: { guid: { sessionID: 0, localID: 2 }, position: '"' },
        type: 'VARIABLE',
        name: 'Radius',
        variableSetID: { guid: { sessionID: 0, localID: 2 } },
        variableResolvedType: 'FLOAT',
        variableDataValues: {
          entries: [
            {
              modeID: { sessionID: 0, localID: 100 },
              variableData: {
                dataType: 'FLOAT',
                value: { floatValue: 12 }
              }
            }
          ]
        }
      },
      {
        guid: { sessionID: 0, localID: 10 },
        parentIndex: { guid: { sessionID: 0, localID: 1 }, position: '"' },
        type: 'FRAME',
        name: 'Card',
        size: { x: 200, y: 150 },
        cornerRadius: 12,
        fillPaints: [
          {
            type: 'SOLID',
            color: { r: 1, g: 0, b: 0, a: 1 },
            colorVariableBinding: { variableID: { sessionID: 0, localID: 3 } }
          }
        ],
        variableConsumptionMap: {
          entries: [
            {
              variableField: 'CORNER_RADIUS',
              variableData: {
                value: { alias: { guid: { sessionID: 0, localID: 4 } } }
              }
            }
          ]
        },
        transform: { m00: 1, m01: 0, m02: 0, m10: 0, m11: 1, m12: 0 }
      }
    ] as NodeChange[]

    const created = importClipboardNodes(nodeChanges, graph, pageId)
    expect(created).toHaveLength(1)

    const card = getNodeOrThrow(graph, created[0])
    expect(card.boundVariables['fills/0/color']).toBe('0:3')
    expect(card.boundVariables['cornerRadius']).toBe('0:4')

    // Resolves color and number for node
    const resolvedColor = graph.resolveColorVariableForNode(card.id, '0:3')
    expect(resolvedColor).toEqual({ r: 1, g: 0, b: 0, a: 1 })

    const resolvedRadius = graph.resolveNumberVariableForNode(card.id, '0:4')
    expect(resolvedRadius).toBe(12)
  })

  it('merges with existing collections and preserves variable IDs', () => {
    const { graph, pageId } = createClipboardGraph()

    // Pre-existing collection and variable in document
    graph.addCollection({
      id: '0:2',
      name: 'Tokens',
      modes: [{ modeId: '0:100', name: 'Default' }],
      defaultModeId: '0:100',
      variableIds: ['existing-var']
    })
    graph.addVariable({
      id: 'existing-var',
      name: 'Existing',
      type: 'FLOAT',
      collectionId: '0:2',
      valuesByMode: { '0:100': 8 },
      description: '',
      hiddenFromPublishing: false
    })

    const nodeChanges = [
      { guid: { sessionID: 0, localID: 0 }, type: 'DOCUMENT', name: 'Document' },
      {
        guid: { sessionID: 0, localID: 1 },
        parentIndex: { guid: { sessionID: 0, localID: 0 }, position: '!' },
        type: 'CANVAS',
        name: 'Page 1'
      },
      {
        guid: { sessionID: 0, localID: 2 },
        parentIndex: { guid: { sessionID: 0, localID: 1 }, position: '!' },
        type: 'VARIABLE_SET',
        name: 'Tokens',
        variableSetModes: [
          { id: { sessionID: 0, localID: 100 }, name: 'Default' },
          { id: { sessionID: 0, localID: 101 }, name: 'Compact' }
        ]
      },
      {
        guid: { sessionID: 0, localID: 3 },
        parentIndex: { guid: { sessionID: 0, localID: 2 }, position: '!' },
        type: 'VARIABLE',
        name: 'PastedVar',
        variableSetID: { guid: { sessionID: 0, localID: 2 } },
        variableResolvedType: 'FLOAT',
        variableDataValues: {
          entries: [
            {
              modeID: { sessionID: 0, localID: 100 },
              variableData: {
                dataType: 'FLOAT',
                value: { floatValue: 24 }
              }
            }
          ]
        }
      },
      {
        guid: { sessionID: 0, localID: 10 },
        parentIndex: { guid: { sessionID: 0, localID: 1 }, position: '!' },
        type: 'FRAME',
        name: 'F',
        size: { x: 50, y: 50 },
        transform: { m00: 1, m01: 0, m02: 0, m10: 0, m11: 1, m12: 0 }
      }
    ] as NodeChange[]

    importClipboardNodes(nodeChanges, graph, pageId)

    const collection = graph.variableCollections.get('0:2')
    expect(collection).toBeDefined()
    // Both existing and newly pasted variables are preserved
    expect(collection?.variableIds).toContain('existing-var')
    expect(collection?.variableIds).toContain('0:3')
    // Modes merged
    expect(collection?.modes).toHaveLength(2)

    expect(graph.variables.get('existing-var')).toBeDefined()
    expect(graph.variables.get('0:3')).toBeDefined()
  })

  it('resolves paint colors from variable aliases on import', () => {
    const { graph, pageId } = createClipboardGraph()

    const nodeChanges = [
      { guid: { sessionID: 0, localID: 0 }, type: 'DOCUMENT', name: 'Document' },
      {
        guid: { sessionID: 0, localID: 1 },
        parentIndex: { guid: { sessionID: 0, localID: 0 }, position: '!' },
        type: 'CANVAS',
        name: 'Page 1'
      },
      {
        guid: { sessionID: 0, localID: 2 },
        parentIndex: { guid: { sessionID: 0, localID: 1 }, position: '!' },
        type: 'VARIABLE_SET',
        name: 'Theme',
        variableSetModes: [{ id: { sessionID: 0, localID: 100 }, name: 'Default' }]
      },
      {
        guid: { sessionID: 0, localID: 3 },
        parentIndex: { guid: { sessionID: 0, localID: 2 }, position: '!' },
        type: 'VARIABLE',
        name: 'BrandGreen',
        variableSetID: { guid: { sessionID: 0, localID: 2 } },
        variableResolvedType: 'COLOR',
        variableDataValues: {
          entries: [
            {
              modeID: { sessionID: 0, localID: 100 },
              variableData: {
                dataType: 'COLOR',
                value: { colorValue: { r: 0.1, g: 0.9, b: 0.2, a: 1 } }
              }
            }
          ]
        }
      },
      {
        guid: { sessionID: 0, localID: 10 },
        parentIndex: { guid: { sessionID: 0, localID: 1 }, position: '!' },
        type: 'RECTANGLE',
        name: 'Badge',
        size: { x: 80, y: 30 },
        fillPaints: [
          {
            type: 'SOLID',
            colorVar: {
              value: {
                alias: { guid: { sessionID: 0, localID: 3 } }
              }
            }
          }
        ],
        transform: { m00: 1, m01: 0, m02: 0, m10: 0, m11: 1, m12: 0 }
      }
    ] as NodeChange[]

    const created = importClipboardNodes(nodeChanges, graph, pageId)
    expect(created).toHaveLength(1)

    const badge = getNodeOrThrow(graph, created[0])
    expect(badge.fills).toHaveLength(1)
    expect(badge.fills[0].color).toEqual({ r: 0.1, g: 0.9, b: 0.2, a: 1 })
    expect(badge.boundVariables['fills/0/color']).toBe('0:3')
  })
})
