import { describe, expect, test } from 'bun:test'

import { createEditor } from '@openweave/core/editor'
import type { ArcData } from '@openweave/scene-graph'

describe('editor shape properties', () => {
  test('updates ellipse arcData with undo and reset', () => {
    const editor = createEditor()
    const pageId = editor.state.currentPageId
    const ellipse = editor.graph.createNode('ELLIPSE', pageId, {
      width: 100,
      height: 100
    })

    expect(ellipse.arcData).toBeNull()

    const newArc: ArcData = {
      startingAngle: 0,
      endingAngle: Math.PI,
      innerRadius: 0.5
    }

    editor.updateNodeWithUndo(ellipse.id, { arcData: newArc }, 'Change arc')
    const updated = editor.graph.getNode(ellipse.id)
    expect(updated?.arcData).toEqual(newArc)

    // Reset arcData to null (full circle)
    editor.updateNodeWithUndo(ellipse.id, { arcData: null }, 'Reset circle')
    expect(editor.graph.getNode(ellipse.id)?.arcData).toBeNull()

    // Undo should restore arcData
    editor.undo.undo()
    expect(editor.graph.getNode(ellipse.id)?.arcData).toEqual(newArc)

    // Redo should reset to full circle
    editor.undo.redo()
    expect(editor.graph.getNode(ellipse.id)?.arcData).toBeNull()
  })

  test('updates polygon pointCount with undo', () => {
    const editor = createEditor()
    const pageId = editor.state.currentPageId
    const poly = editor.graph.createNode('POLYGON', pageId, {
      width: 100,
      height: 100,
      pointCount: 3
    })

    expect(poly.pointCount).toBe(3)

    editor.updateNodeWithUndo(poly.id, { pointCount: 6 }, 'Change side count')
    expect(editor.graph.getNode(poly.id)?.pointCount).toBe(6)

    editor.undo.undo()
    expect(editor.graph.getNode(poly.id)?.pointCount).toBe(3)

    editor.undo.redo()
    expect(editor.graph.getNode(poly.id)?.pointCount).toBe(6)
  })

  test('updates star pointCount and starInnerRadius with undo', () => {
    const editor = createEditor()
    const pageId = editor.state.currentPageId
    const star = editor.graph.createNode('STAR', pageId, {
      width: 100,
      height: 100,
      pointCount: 5,
      starInnerRadius: 0.382
    })

    expect(star.pointCount).toBe(5)
    expect(star.starInnerRadius).toBeCloseTo(0.382)

    editor.updateNodeWithUndo(star.id, { pointCount: 8, starInnerRadius: 0.5 }, 'Change star props')
    const updated = editor.graph.getNode(star.id)
    expect(updated?.pointCount).toBe(8)
    expect(updated?.starInnerRadius).toBe(0.5)

    editor.undo.undo()
    const undone = editor.graph.getNode(star.id)
    expect(undone?.pointCount).toBe(5)
    expect(undone?.starInnerRadius).toBeCloseTo(0.382)

    editor.undo.redo()
    const redone = editor.graph.getNode(star.id)
    expect(redone?.pointCount).toBe(8)
    expect(redone?.starInnerRadius).toBe(0.5)
  })

  test('updates booleanOperation on BOOLEAN_OPERATION node with undo', () => {
    const editor = createEditor()
    const pageId = editor.state.currentPageId
    const first = editor.graph.createNode('RECTANGLE', pageId, { width: 50, height: 50 })
    const second = editor.graph.createNode('ELLIPSE', pageId, { width: 50, height: 50 })

    editor.select([first.id, second.id])
    editor.booleanOperationSelected('UNION')

    const [booleanId] = [...editor.state.selectedIds]
    const booleanNode = editor.graph.getNode(booleanId)
    expect(booleanNode?.type).toBe('BOOLEAN_OPERATION')
    expect(booleanNode?.booleanOperation).toBe('UNION')

    // Change to SUBTRACT
    editor.updateNodeWithUndo(
      booleanId,
      { booleanOperation: 'SUBTRACT' },
      'Change boolean operation'
    )
    expect(editor.graph.getNode(booleanId)?.booleanOperation).toBe('SUBTRACT')

    // Change to INTERSECT
    editor.updateNodeWithUndo(
      booleanId,
      { booleanOperation: 'INTERSECT' },
      'Change boolean operation'
    )
    expect(editor.graph.getNode(booleanId)?.booleanOperation).toBe('INTERSECT')

    // Undo should go back to SUBTRACT
    editor.undo.undo()
    expect(editor.graph.getNode(booleanId)?.booleanOperation).toBe('SUBTRACT')

    // Undo should go back to UNION
    editor.undo.undo()
    expect(editor.graph.getNode(booleanId)?.booleanOperation).toBe('UNION')

    // Redo should go forward
    editor.undo.redo()
    expect(editor.graph.getNode(booleanId)?.booleanOperation).toBe('SUBTRACT')
  })

  test('creates and updates SHADER node with undo and presets', () => {
    const editor = createEditor()
    const shaderId = editor.createShape('SHADER', 50, 60, 300, 200)

    const node = editor.graph.getNode(shaderId)
    expect(node).toBeDefined()
    expect(node?.type).toBe('SHADER')
    expect(node?.shader).toBeDefined()
    expect(node?.shader?.preset).toBe('ANIMATED_GRADIENT')
    expect(node?.shader?.speed).toBe(1.0)
    expect(node?.shader?.colors.length).toBeGreaterThanOrEqual(2)

    // Update preset and speed
    editor.updateNodeWithUndo(
      shaderId,
      {
        shader: {
          ...node!.shader!,
          preset: 'METABALLS',
          speed: 2.0,
          intensity: 1.5
        }
      },
      'Change shader preset'
    )

    const updated = editor.graph.getNode(shaderId)
    expect(updated?.shader?.preset).toBe('METABALLS')
    expect(updated?.shader?.speed).toBe(2.0)
    expect(updated?.shader?.intensity).toBe(1.5)

    // Undo restores previous shader config
    editor.undo.undo()
    const undone = editor.graph.getNode(shaderId)
    expect(undone?.shader?.preset).toBe('ANIMATED_GRADIENT')
    expect(undone?.shader?.speed).toBe(1.0)

    // Redo restores METABALLS
    editor.undo.redo()
    expect(editor.graph.getNode(shaderId)?.shader?.preset).toBe('METABALLS')
  })
})
