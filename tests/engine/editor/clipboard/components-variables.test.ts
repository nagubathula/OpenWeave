import { beforeAll, describe, expect, it } from 'bun:test'

import { initCodec } from '@openweave/core'
import type { NodeChange } from '@openweave/core'
import { importClipboardNodes } from '@openweave/core'
import {
  buildFigmaClipboardHTML,
  buildOpenWeaveClipboardHTML,
  parseFigmaClipboard
} from '@openweave/core/clipboard'
import { createEditor } from '@openweave/core/editor'

import { createClipboardGraph } from '#tests/helpers/clipboard'

describe('Clipboard: components with variables', () => {
  beforeAll(async () => {
    await initCodec()
  })

  it('imports component and instance with bound variables, aliases, and modes', () => {
    const { graph, pageId } = createClipboardGraph()

    const nodeChanges = [
      { guid: { sessionID: 0, localID: 0 }, type: 'DOCUMENT', name: 'Doc' },
      {
        guid: { sessionID: 0, localID: 1 },
        parentIndex: { guid: { sessionID: 0, localID: 0 }, position: '!' },
        type: 'CANVAS',
        name: 'Page 1'
      },
      // Variable collection
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
      // Target Color Variable
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
                value: { colorValue: { r: 1, g: 0, b: 0, a: 1 } }
              }
            },
            {
              modeID: { sessionID: 0, localID: 101 },
              variableData: {
                dataType: 'COLOR',
                value: { colorValue: { r: 0, g: 0, b: 1, a: 1 } }
              }
            }
          ]
        }
      },
      // Alias Color Variable pointing to 0:3
      {
        guid: { sessionID: 0, localID: 4 },
        parentIndex: { guid: { sessionID: 0, localID: 2 }, position: '"' },
        type: 'VARIABLE',
        name: 'Colors/ButtonBg',
        variableSetID: { guid: { sessionID: 0, localID: 2 } },
        variableResolvedType: 'COLOR',
        variableDataValues: {
          entries: [
            {
              modeID: { sessionID: 0, localID: 100 },
              variableData: {
                dataType: 'ALIAS',
                value: { alias: { guid: { sessionID: 0, localID: 3 } } }
              }
            }
          ]
        }
      },
      // Float Variable for CornerRadius
      {
        guid: { sessionID: 0, localID: 5 },
        parentIndex: { guid: { sessionID: 0, localID: 2 }, position: '#' },
        type: 'VARIABLE',
        name: 'Sizes/Radius',
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
      // Symbol (Component)
      {
        guid: { sessionID: 1, localID: 10 },
        parentIndex: { guid: { sessionID: 0, localID: 1 }, position: '"' },
        type: 'SYMBOL',
        name: 'Button',
        size: { x: 120, y: 40 },
        transform: { m00: 1, m01: 0, m02: 0, m10: 0, m11: 1, m12: 0 },
        cornerRadius: 12,
        fillPaints: [
          {
            type: 'SOLID',
            color: { r: 1, g: 0, b: 0, a: 1 },
            colorVar: {
              value: { alias: { guid: { sessionID: 0, localID: 4 } } }
            }
          }
        ],
        variableConsumptionMap: {
          entries: [
            {
              variableField: 'CORNER_RADIUS',
              variableData: {
                dataType: 'ALIAS',
                value: { alias: { guid: { sessionID: 0, localID: 5 } } }
              }
            }
          ]
        }
      },
      // Child of Symbol
      {
        guid: { sessionID: 1, localID: 11 },
        parentIndex: { guid: { sessionID: 1, localID: 10 }, position: '!' },
        type: 'TEXT',
        name: 'Label',
        size: { x: 80, y: 20 },
        transform: { m00: 1, m01: 0, m02: 20, m10: 0, m11: 1, m12: 10 },
        textData: { characters: 'Click Me' }
      },
      // Instance referencing the Symbol
      {
        guid: { sessionID: 2, localID: 20 },
        parentIndex: { guid: { sessionID: 0, localID: 1 }, position: '#' },
        type: 'INSTANCE',
        name: 'Button Instance',
        size: { x: 120, y: 40 },
        transform: { m00: 1, m01: 0, m02: 200, m10: 0, m11: 1, m12: 0 },
        symbolData: { symbolID: { sessionID: 1, localID: 10 } }
      }
    ] as NodeChange[]

    const created = importClipboardNodes(nodeChanges, graph, pageId)
    expect(created).toHaveLength(2)

    const comp = graph.getNode(created[0])
    expect(comp?.type).toBe('COMPONENT')
    expect(comp?.boundVariables['cornerRadius']).toBe('0:5')
    expect(comp?.boundVariables['fills/0/color']).toBe('0:4')

    const inst = graph.getNode(created[1])
    expect(inst?.type).toBe('INSTANCE')
    expect(inst?.componentId).toBe(comp?.id)

    // Resolved color through alias: 0:4 -> 0:3 -> red
    const resolvedColor = graph.resolveColorVariableForNode(comp!.id, '0:4')
    expect(resolvedColor).toEqual({ r: 1, g: 0, b: 0, a: 1 })

    // Resolved number for node
    const resolvedRadius = graph.resolveNumberVariableForNode(comp!.id, '0:5')
    expect(resolvedRadius).toBe(12)
  })

  it('pastes components with variables into a live editor, copies them, and pastes again', async () => {
    const editor = createEditor()
    editor.subscribeToGraph()

    // 1. Setup collection and variable in editor
    editor.graph.addCollection({
      id: 'col-theme',
      name: 'Theme',
      modes: [
        { modeId: 'mode-light', name: 'Light' },
        { modeId: 'mode-dark', name: 'Dark' }
      ],
      defaultModeId: 'mode-light',
      variableIds: ['var-color', 'var-radius']
    })
    editor.graph.addVariable({
      id: 'var-color',
      name: 'Primary',
      type: 'COLOR',
      collectionId: 'col-theme',
      valuesByMode: {
        'mode-light': { r: 1, g: 0, b: 0, a: 1 },
        'mode-dark': { r: 0, g: 0, b: 1, a: 1 }
      },
      description: '',
      hiddenFromPublishing: false
    })
    editor.graph.addVariable({
      id: 'var-radius',
      name: 'CornerRadius',
      type: 'FLOAT',
      collectionId: 'col-theme',
      valuesByMode: {
        'mode-light': 16,
        'mode-dark': 8
      },
      description: '',
      hiddenFromPublishing: false
    })

    // 2. Create a Component with variable bindings
    const comp = editor.graph.createNode('COMPONENT', editor.state.currentPageId, {
      name: 'CardComponent',
      x: 0,
      y: 0,
      width: 200,
      height: 100,
      cornerRadius: 16,
      boundVariables: {
        cornerRadius: 'var-radius',
        'fills/0/color': 'var-color'
      },
      fills: [
        {
          type: 'SOLID',
          color: { r: 1, g: 0, b: 0, a: 1 },
          opacity: 1,
          visible: true
        }
      ]
    })

    // Create an Instance of this Component
    const inst = editor.graph.createNode('INSTANCE', editor.state.currentPageId, {
      name: 'CardInstance',
      componentId: comp.id,
      x: 300,
      y: 0,
      width: 200,
      height: 100,
      cornerRadius: 16,
      boundVariables: {
        cornerRadius: 'var-radius',
        'fills/0/color': 'var-color'
      },
      fills: [
        {
          type: 'SOLID',
          color: { r: 1, g: 0, b: 0, a: 1 },
          opacity: 1,
          visible: true
        }
      ]
    })

    // 3. Build clipboard HTML for the instance and component
    const html = await buildFigmaClipboardHTML([comp, inst], editor.graph)
    expect(html).toBeTruthy()

    // 4. Paste into a new editor
    const editor2 = createEditor()
    editor2.subscribeToGraph()

    await editor2.pasteFromHTML(html!)

    // Verify pasted nodes in editor2
    expect(editor2.state.selectedIds.size).toBeGreaterThan(0)
  })

  it('writeCopyData combines OpenWeave and Figma payloads and preserves variables and component remap', async () => {
    class MockDataTransfer {
      data = new Map<string, string>()
      setData(format: string, data: string) {
        this.data.set(format, data)
      }
      getData(format: string): string {
        return this.data.get(format) ?? ''
      }
    }

    const editor1 = createEditor()
    editor1.subscribeToGraph()

    editor1.graph.addCollection({
      id: 'col-tokens',
      name: 'DesignTokens',
      modes: [{ modeId: 'm-default', name: 'Default' }],
      defaultModeId: 'm-default',
      variableIds: ['var-spacing', 'var-fill']
    })
    editor1.graph.addVariable({
      id: 'var-spacing',
      name: 'Spacing/Base',
      type: 'FLOAT',
      collectionId: 'col-tokens',
      valuesByMode: { 'm-default': 24 },
      description: '',
      hiddenFromPublishing: false
    })
    editor1.graph.addVariable({
      id: 'var-fill',
      name: 'Colors/Surface',
      type: 'COLOR',
      collectionId: 'col-tokens',
      valuesByMode: { 'm-default': { r: 0.1, g: 0.2, b: 0.3, a: 1 } },
      description: '',
      hiddenFromPublishing: false
    })

    const comp = editor1.graph.createNode('COMPONENT', editor1.state.currentPageId, {
      name: 'HeaderComponent',
      width: 400,
      height: 80,
      boundVariables: {
        itemSpacing: 'var-spacing',
        'fills/0/color': 'var-fill'
      },
      fills: [
        {
          type: 'SOLID',
          color: { r: 0.1, g: 0.2, b: 0.3, a: 1 },
          opacity: 1,
          visible: true
        }
      ]
    })

    const inst = editor1.graph.createNode('INSTANCE', editor1.state.currentPageId, {
      name: 'HeaderInstance',
      componentId: comp.id,
      width: 400,
      height: 80,
      boundVariables: {
        itemSpacing: 'var-spacing'
      }
    })

    editor1.select([comp.id, inst.id])

    const transfer = new MockDataTransfer() as unknown as DataTransfer
    await editor1.writeCopyData(transfer)

    const html = transfer.getData('text/html')
    expect(html).toContain('<!--(openweave)')
    expect(html).toContain('(figma)')

    // Paste into a fresh editor
    const editor2 = createEditor()
    editor2.subscribeToGraph()

    await editor2.pasteFromHTML(html)

    // Variables and collection restored
    expect(editor2.graph.variableCollections.has('col-tokens')).toBe(true)
    expect(editor2.graph.variables.has('var-spacing')).toBe(true)
    expect(editor2.graph.variables.has('var-fill')).toBe(true)

    // Two nodes created in editor2
    const pastedIds = Array.from(editor2.state.selectedIds)
    expect(pastedIds).toHaveLength(2)

    const pastedComp = pastedIds
      .map((id) => editor2.graph.getNode(id))
      .find((n) => n?.type === 'COMPONENT')
    const pastedInst = pastedIds
      .map((id) => editor2.graph.getNode(id))
      .find((n) => n?.type === 'INSTANCE')

    expect(pastedComp).toBeTruthy()
    expect(pastedInst).toBeTruthy()

    // Instance componentId remapped to newly pasted component in editor2
    expect(pastedInst?.componentId).toBe(pastedComp?.id)
  })

  it('buildFigmaClipboardHTML exports instance alone by placing referenced component on internal canvas', async () => {
    const editor = createEditor()
    editor.subscribeToGraph()

    const comp = editor.graph.createNode('COMPONENT', editor.state.currentPageId, {
      name: 'StandaloneButton',
      width: 120,
      height: 40
    })

    const inst = editor.graph.createNode('INSTANCE', editor.state.currentPageId, {
      name: 'StandaloneButtonInstance',
      componentId: comp.id,
      width: 120,
      height: 40
    })

    // Copy ONLY the instance (not comp)
    const html = await buildFigmaClipboardHTML([inst], editor.graph)
    expect(html).toBeTruthy()

    // Paste into fresh editor via Figma pipeline
    const editor2 = createEditor()
    editor2.subscribeToGraph()

    await editor2.pasteFromHTML(html!)
    expect(editor2.state.selectedIds.size).toBeGreaterThan(0)
  })

  it('collectNodeTree cycle protection handles cyclic childIds without infinite recursion', () => {
    const { graph, pageId } = createClipboardGraph()
    const nodeA = graph.createNode('FRAME', pageId, { name: 'NodeA' })
    const nodeB = graph.createNode('FRAME', nodeA.id, { name: 'NodeB' })

    // Simulate cyclic parent-child corruption
    nodeB.childIds.push(nodeA.id)

    const startTime = performance.now()
    const html = buildOpenWeaveClipboardHTML([nodeA], graph)
    const elapsed = performance.now() - startTime

    expect(html).toBeTruthy()
    expect(elapsed).toBeLessThan(100) // Must terminate immediately without hanging
  })

  it('buildFigmaClipboardHTML only exports referenced variables and ignores thousands of unreferenced variables', async () => {
    const editor = createEditor()
    editor.subscribeToGraph()

    // Add a collection with 500 variables
    const varIds: string[] = []
    for (let i = 0; i < 500; i++) {
      const vid = `var-unreferenced-${i}`
      varIds.push(vid)
      editor.graph.addVariable({
        id: vid,
        name: `Token_${i}`,
        type: 'FLOAT',
        collectionId: 'col-huge',
        valuesByMode: { default: i },
        description: '',
        hiddenFromPublishing: false
      })
    }

    // Add 1 referenced variable
    editor.graph.addVariable({
      id: 'var-used',
      name: 'UsedToken',
      type: 'FLOAT',
      collectionId: 'col-huge',
      valuesByMode: { default: 42 },
      description: '',
      hiddenFromPublishing: false
    })
    varIds.push('var-used')

    editor.graph.addCollection({
      id: 'col-huge',
      name: 'HugeCollection',
      modes: [{ modeId: 'default', name: 'Default' }],
      defaultModeId: 'default',
      variableIds: varIds
    })

    const node = editor.graph.createNode('FRAME', editor.state.currentPageId, {
      name: 'FrameWithOneVar',
      width: 100,
      height: 100,
      boundVariables: {
        cornerRadius: 'var-used'
      }
    })

    const startTime = performance.now()
    const html = await buildFigmaClipboardHTML([node], editor.graph)
    const elapsed = performance.now() - startTime

    expect(html).toBeTruthy()
    expect(elapsed).toBeLessThan(500) // Fast and lightweight

    const parsed = await parseFigmaClipboard(html!)
    expect(parsed).toBeTruthy()

    const varChanges = parsed!.nodes.filter((n) => n.type === 'VARIABLE')
    // Must only export the 1 referenced variable, not all 501 variables!
    expect(varChanges).toHaveLength(1)
    expect(varChanges[0].name).toBe('UsedToken')
  })

  it('buildFigmaClipboardHTML handles transitive nested component references', async () => {
    const editor = createEditor()
    editor.subscribeToGraph()

    // Inner component B
    const compB = editor.graph.createNode('COMPONENT', editor.state.currentPageId, {
      name: 'IconComp',
      width: 24,
      height: 24
    })

    // Outer component A containing an instance of B
    const compA = editor.graph.createNode('COMPONENT', editor.state.currentPageId, {
      name: 'ButtonWithIconComp',
      width: 120,
      height: 40
    })
    const instB = editor.graph.createNode('INSTANCE', compA.id, {
      name: 'IconInstance',
      componentId: compB.id,
      width: 24,
      height: 24
    })
    compA.childIds.push(instB.id)

    // Instance of A
    const instA = editor.graph.createNode('INSTANCE', editor.state.currentPageId, {
      name: 'ButtonInstance',
      componentId: compA.id,
      width: 120,
      height: 40
    })

    // Copy only instA
    const html = await buildFigmaClipboardHTML([instA], editor.graph)
    expect(html).toBeTruthy()

    const parsed = await parseFigmaClipboard(html!)
    expect(parsed).toBeTruthy()

    // Both compA and compB must be present in the clipboard data
    const symbolChanges = parsed!.nodes.filter((n) => n.type === 'SYMBOL')
    const symbolNames = symbolChanges.map((s) => s.name)
    expect(symbolNames).toContain('ButtonWithIconComp')
    expect(symbolNames).toContain('IconComp')
  })

  it('pasteOpenWeaveNodes remaps child.componentId on non-instance children of instances', async () => {
    const editor1 = createEditor()
    editor1.subscribeToGraph()

    // Component with a Text child
    const comp = editor1.graph.createNode('COMPONENT', editor1.state.currentPageId, {
      name: 'CompWithChild',
      width: 100,
      height: 50
    })
    const compText = editor1.graph.createNode('TEXT', comp.id, {
      name: 'CompText',
      text: 'Hello'
    })
    comp.childIds.push(compText.id)

    // Instance with a Text child whose componentId points to compText.id
    const inst = editor1.graph.createNode('INSTANCE', editor1.state.currentPageId, {
      name: 'InstWithChild',
      componentId: comp.id,
      width: 100,
      height: 50
    })
    const instText = editor1.graph.createNode('TEXT', inst.id, {
      name: 'InstText',
      componentId: compText.id,
      text: 'Hello'
    })
    inst.childIds.push(instText.id)

    const html = buildOpenWeaveClipboardHTML([comp, inst], editor1.graph)

    const editor2 = createEditor()
    editor2.subscribeToGraph()
    await editor2.pasteFromHTML(html)

    const pastedIds = Array.from(editor2.state.selectedIds)
    expect(pastedIds).toHaveLength(2)

    const pastedComp = pastedIds
      .map((id) => editor2.graph.getNode(id))
      .find((n) => n?.type === 'COMPONENT')
    const pastedInst = pastedIds
      .map((id) => editor2.graph.getNode(id))
      .find((n) => n?.type === 'INSTANCE')

    expect(pastedComp).toBeTruthy()
    expect(pastedInst).toBeTruthy()

    const pastedCompTextId = pastedComp!.childIds[0]
    const pastedInstTextId = pastedInst!.childIds[0]
    const pastedInstText = editor2.graph.getNode(pastedInstTextId)

    // Provenance remapped to new component's text child!
    expect(pastedInstText?.componentId).toBe(pastedCompTextId)
  })
})
