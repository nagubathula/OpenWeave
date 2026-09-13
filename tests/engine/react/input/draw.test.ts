import { describe, expect, test } from 'bun:test'

import { startShapeDraw, handleDrawMove, handleDrawUp } from '#react/shared/input/draw'
import type { DragDraw, DragState } from '#react/shared/input/types'

import { createEditor } from '@openweave/core/editor'

import { getNodeOrThrow } from '#tests/helpers/assert'

describe('shape drawing', () => {
  function setup(tool: 'FRAME' | 'RECTANGLE' = 'FRAME') {
    const editor = createEditor({
      getViewportSize: () => ({ width: 1000, height: 800 })
    })
    editor.setTool(tool)
    let currentDrag: DragState | null = null
    const setDrag = (d: DragState) => {
      currentDrag = d
    }
    return {
      editor,
      setDrag,
      getDrag: () => currentDrag as DragDraw | null
    }
  }

  test('startShapeDraw creates a 0x0 shape and sets drag state', () => {
    const { editor, setDrag, getDrag } = setup('FRAME')

    startShapeDraw(100, 150, editor, setDrag)
    const drag = getDrag()

    expect(drag).not.toBeNull()
    expect(drag?.type).toBe('draw')
    expect(drag?.startX).toBe(100)
    expect(drag?.startY).toBe(150)

    const node = getNodeOrThrow(editor.graph, drag!.nodeId)
    expect(node.type).toBe('FRAME')
    expect(node.x).toBe(100)
    expect(node.y).toBe(150)
    expect(node.width).toBe(0)
    expect(node.height).toBe(0)
    expect(editor.state.selectedIds.has(node.id)).toBe(true)
  })

  test('handleDrawMove updates dimensions while dragging', () => {
    const { editor, setDrag, getDrag } = setup('FRAME')

    startShapeDraw(100, 150, editor, setDrag)
    const drag = getDrag()!

    handleDrawMove(drag, 400, 500, false, editor)
    const node = getNodeOrThrow(editor.graph, drag.nodeId)
    expect(node.x).toBe(100)
    expect(node.y).toBe(150)
    expect(node.width).toBe(300)
    expect(node.height).toBe(350)
  })

  test('handleDrawUp finalizes shape and resets active tool to SELECT', () => {
    const { editor, setDrag, getDrag } = setup('FRAME')

    startShapeDraw(100, 150, editor, setDrag)
    const drag = getDrag()!

    handleDrawMove(drag, 400, 500, false, editor)
    handleDrawUp(drag, editor)

    const node = getNodeOrThrow(editor.graph, drag.nodeId)
    expect(node.width).toBe(300)
    expect(node.height).toBe(350)
    expect(editor.state.activeTool).toBe('SELECT')
  })

  test('single click without drag defaults to 100x100 size', () => {
    const { editor, setDrag, getDrag } = setup('RECTANGLE')

    startShapeDraw(200, 200, editor, setDrag)
    const drag = getDrag()!

    // Click without move
    handleDrawUp(drag, editor)

    const node = getNodeOrThrow(editor.graph, drag.nodeId)
    expect(node.type).toBe('RECTANGLE')
    expect(node.width).toBe(100)
    expect(node.height).toBe(100)
    expect(editor.state.activeTool).toBe('SELECT')
  })

  test('createFrameFromPreset creates preset and returns to SELECT', () => {
    const editor = createEditor({
      getViewportSize: () => ({ width: 1000, height: 800 })
    })
    editor.setTool('FRAME')

    const frameId = editor.createFrameFromPreset({
      name: 'iPhone 16',
      width: 393,
      height: 852
    })

    const node = getNodeOrThrow(editor.graph, frameId)
    expect(node.type).toBe('FRAME')
    expect(node.name).toBe('iPhone 16')
    expect(node.width).toBe(393)
    expect(node.height).toBe(852)
    expect(editor.state.activeTool).toBe('SELECT')
    expect(editor.state.selectedIds.has(frameId)).toBe(true)
  })
})
