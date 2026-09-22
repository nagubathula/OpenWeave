import { describe, expect, test } from 'bun:test'

import { createEditor } from '@openweave/core/editor'

describe('editor clipboard properties', () => {
  test('copies visual styles from selected node and pastes to target nodes', () => {
    const editor = createEditor()
    const pageId = editor.state.currentPageId

    const source = editor.graph.createNode('RECTANGLE', pageId, {
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      fills: [{ type: 'SOLID', color: { r: 1, g: 0, b: 0, a: 1 } }],
      strokes: [{ type: 'SOLID', color: { r: 0, g: 0, b: 1, a: 1 } }],
      borderTopWeight: 4,
      borderRightWeight: 4,
      borderBottomWeight: 4,
      borderLeftWeight: 4,
      cornerRadius: 12,
      opacity: 0.8,
      blendMode: 'MULTIPLY'
    })

    const target1 = editor.graph.createNode('RECTANGLE', pageId, {
      x: 120,
      y: 0,
      width: 50,
      height: 50
    })
    const target2 = editor.graph.createNode('ELLIPSE', pageId, {
      x: 200,
      y: 0,
      width: 50,
      height: 50
    })

    editor.select([source.id])
    const copied = editor.copyProperties()
    expect(copied).not.toBeNull()
    expect(copied?.opacity).toBe(0.8)
    expect(copied?.cornerRadius).toBe(12)
    expect(copied?.borderTopWeight).toBe(4)

    editor.select([target1.id, target2.id])
    editor.pasteProperties()

    const updated1 = editor.graph.getNode(target1.id)
    const updated2 = editor.graph.getNode(target2.id)

    expect(updated1?.fills).toEqual(source.fills)
    expect(updated1?.strokes).toEqual(source.strokes)
    expect(updated1?.borderTopWeight).toBe(4)
    expect(updated1?.cornerRadius).toBe(12)
    expect(updated1?.opacity).toBe(0.8)
    expect(updated1?.blendMode).toBe('MULTIPLY')

    expect(updated2?.fills).toEqual(source.fills)
    expect(updated2?.strokes).toEqual(source.strokes)
    expect(updated2?.borderTopWeight).toBe(4)
    expect(updated2?.opacity).toBe(0.8)

    // Undo should restore previous values
    editor.undo.undo()
    const restored1 = editor.graph.getNode(target1.id)
    expect(restored1?.fills).not.toEqual(source.fills)
    expect(restored1?.opacity).toBe(1)
  })

  test('copies typography properties between text nodes', () => {
    const editor = createEditor()
    const pageId = editor.state.currentPageId

    const textSource = editor.graph.createNode('TEXT', pageId, {
      x: 0,
      y: 0,
      width: 200,
      height: 50,
      text: 'Heading',
      fontFamily: 'Roboto',
      fontWeight: 700,
      fontSize: 32,
      lineHeight: 40,
      letterSpacing: 2,
      textAlignHorizontal: 'CENTER',
      textCase: 'UPPER',
      fills: [{ type: 'SOLID', color: { r: 0.2, g: 0.8, b: 0.2, a: 1 } }]
    })

    const textTarget = editor.graph.createNode('TEXT', pageId, {
      x: 0,
      y: 80,
      width: 100,
      height: 20,
      text: 'Body',
      fontFamily: 'Inter',
      fontWeight: 400,
      fontSize: 14
    })

    editor.select([textSource.id])
    editor.copyProperties()

    editor.select([textTarget.id])
    editor.pasteProperties()

    const updated = editor.graph.getNode(textTarget.id)
    expect(updated?.fontFamily).toBe('Roboto')
    expect(updated?.fontWeight).toBe(700)
    expect(updated?.fontSize).toBe(32)
    expect(updated?.lineHeight).toBe(40)
    expect(updated?.letterSpacing).toBe(2)
    expect(updated?.textAlignHorizontal).toBe('CENTER')
    expect(updated?.textCase).toBe('UPPER')
    expect(updated?.fills).toEqual(textSource.fills)
  })

  test('ignores locked nodes when pasting properties', () => {
    const editor = createEditor()
    const pageId = editor.state.currentPageId

    const source = editor.graph.createNode('RECTANGLE', pageId, {
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      opacity: 0.5
    })
    const lockedTarget = editor.graph.createNode('RECTANGLE', pageId, {
      x: 120,
      y: 0,
      width: 50,
      height: 50,
      locked: true,
      opacity: 1
    })

    editor.select([source.id])
    editor.copyProperties()

    editor.pasteProperties([lockedTarget.id])
    const after = editor.graph.getNode(lockedTarget.id)
    expect(after?.opacity).toBe(1)
  })
})
