import { describe, expect, test } from 'bun:test'

import { createEditor } from '@openweave/core/editor'

import { getNodeOrThrow } from '#tests/helpers/assert'

/** Simulate the draw tool: batch(create + resize + frame adoption). */
function drawShape(
  editor: ReturnType<typeof createEditor>,
  type: 'RECTANGLE' | 'ELLIPSE' | 'TEXT' | 'FRAME',
  x: number,
  y: number,
  width: number,
  height: number
) {
  editor.undo.beginBatch('Create shape')
  const id = editor.createShape(type, x, y, 0, 0)
  editor.graph.updateNode(id, { x, y, width, height })
  editor.commitResize(id, { x, y, width: 0, height: 0 })
  editor.adoptNodeIntoFrame(id)
  editor.undo.commitBatch()
  return id
}

describe('auto-parenting drawn nodes into frames', () => {
  test('rectangle drawn fully inside a frame becomes its child at the same absolute position', () => {
    const editor = createEditor()
    const frameId = editor.createShape('FRAME', 100, 100, 300, 300)

    const rectId = drawShape(editor, 'RECTANGLE', 150, 150, 80, 60)

    const rect = getNodeOrThrow(editor.graph, rectId)
    expect(rect.parentId).toBe(frameId)
    expect(rect.x).toBe(50)
    expect(rect.y).toBe(50)
    const abs = editor.graph.getAbsolutePosition(rectId)
    expect(abs.x).toBe(150)
    expect(abs.y).toBe(150)
  })

  test('point-click text inside a frame becomes its child', () => {
    const editor = createEditor()
    const frameId = editor.createShape('FRAME', 100, 100, 300, 300)

    const textId = drawShape(editor, 'TEXT', 200, 200, 120, 24)

    expect(getNodeOrThrow(editor.graph, textId).parentId).toBe(frameId)
  })

  test('rectangle only partially overlapping a frame stays at page level', () => {
    const editor = createEditor()
    editor.createShape('FRAME', 100, 100, 300, 300)

    const rectId = drawShape(editor, 'RECTANGLE', 350, 350, 120, 120)

    expect(getNodeOrThrow(editor.graph, rectId).parentId).toBe(editor.state.currentPageId)
  })

  test('frame drawn around a smaller frame is not swallowed by it', () => {
    const editor = createEditor()
    editor.createShape('FRAME', 200, 200, 100, 100)

    const bigId = drawShape(editor, 'FRAME', 100, 100, 300, 300)

    expect(getNodeOrThrow(editor.graph, bigId).parentId).toBe(editor.state.currentPageId)
  })

  test('nested frames adopt into the deepest containing frame', () => {
    const editor = createEditor()
    const outerId = editor.createShape('FRAME', 0, 0, 400, 400)
    const innerId = editor.createShape('FRAME', 50, 50, 200, 200, outerId)

    const rectId = drawShape(editor, 'RECTANGLE', 80, 80, 40, 40)

    expect(getNodeOrThrow(editor.graph, rectId).parentId).toBe(innerId)
    const abs = editor.graph.getAbsolutePosition(rectId)
    expect(abs.x).toBe(80)
    expect(abs.y).toBe(80)
  })

  test('undo removes the drawn node in one step; redo restores it nested', () => {
    const editor = createEditor()
    const frameId = editor.createShape('FRAME', 100, 100, 300, 300)

    const rectId = drawShape(editor, 'RECTANGLE', 150, 150, 80, 60)
    expect(getNodeOrThrow(editor.graph, rectId).parentId).toBe(frameId)

    editor.undo.undo()
    expect(editor.graph.getNode(rectId)).toBeUndefined()

    editor.undo.redo()
    const restored = getNodeOrThrow(editor.graph, rectId)
    expect(restored.parentId).toBe(frameId)
    expect(restored.x).toBe(50)
    expect(restored.y).toBe(50)
    expect(restored.width).toBe(80)
    expect(restored.height).toBe(60)
  })
})
