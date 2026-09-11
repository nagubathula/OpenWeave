import { describe, expect, test } from 'bun:test'

import { createEditor } from '@openweave/core/editor'

describe('grid and advanced layout controls', () => {
  test('updates and undoes gridPosition on child node in grid layout', () => {
    const editor = createEditor()
    const parent = editor.graph.createNode('FRAME', editor.state.currentPageId, {
      layoutMode: 'GRID',
      gridColumns: 'repeat(2, 1fr)',
      gridRows: 'auto'
    })
    const child = editor.graph.createNode('RECTANGLE', parent.id, {
      name: 'Grid Child',
      gridPosition: {
        column: 1,
        row: 1,
        columnSpan: 1,
        rowSpan: 1
      }
    })

    editor.updateNodeWithUndo(
      child.id,
      {
        gridPosition: {
          column: 2,
          row: 3,
          columnSpan: 2,
          rowSpan: 1
        }
      },
      'Change grid position'
    )

    expect(editor.graph.getNode(child.id)).toMatchObject({
      gridPosition: {
        column: 2,
        row: 3,
        columnSpan: 2,
        rowSpan: 1
      }
    })

    editor.undo.undo()

    expect(editor.graph.getNode(child.id)).toMatchObject({
      gridPosition: {
        column: 1,
        row: 1,
        columnSpan: 1,
        rowSpan: 1
      }
    })
  })

  test('updates and undoes itemReverseZIndex, strokesIncludedInLayout, and counterAxisAlignContent', () => {
    const editor = createEditor()
    const frame = editor.graph.createNode('FRAME', editor.state.currentPageId, {
      layoutMode: 'HORIZONTAL',
      layoutWrap: 'WRAP',
      itemReverseZIndex: false,
      strokesIncludedInLayout: false,
      counterAxisAlignContent: 'AUTO'
    })

    editor.updateNodeWithUndo(
      frame.id,
      {
        itemReverseZIndex: true,
        strokesIncludedInLayout: true,
        counterAxisAlignContent: 'SPACE_BETWEEN'
      },
      'Change advanced layout settings'
    )

    expect(editor.graph.getNode(frame.id)).toMatchObject({
      itemReverseZIndex: true,
      strokesIncludedInLayout: true,
      counterAxisAlignContent: 'SPACE_BETWEEN'
    })

    editor.undo.undo()

    expect(editor.graph.getNode(frame.id)).toMatchObject({
      itemReverseZIndex: false,
      strokesIncludedInLayout: false,
      counterAxisAlignContent: 'AUTO'
    })
  })

  test('updates and undoes maskIsOutline on a mask node', () => {
    const editor = createEditor()
    const rect = editor.graph.createNode('RECTANGLE', editor.state.currentPageId, {
      isMask: true,
      maskType: 'ALPHA',
      maskIsOutline: false
    })

    editor.updateNodeWithUndo(rect.id, { maskIsOutline: true }, 'Toggle mask outline')

    expect(editor.graph.getNode(rect.id)).toMatchObject({
      maskIsOutline: true
    })

    editor.undo.undo()

    expect(editor.graph.getNode(rect.id)).toMatchObject({
      maskIsOutline: false
    })
  })
})
