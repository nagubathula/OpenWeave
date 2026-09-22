import { describe, expect, test } from 'bun:test'

import {
  findHoveredGuide,
  handleGuideDragMove,
  handleGuideDragUp,
  tryStartGuideDrag
} from '#react/shared/input/select/guides'
import type { DragGuide, DragState } from '#react/shared/input/types'

import { RULER_SIZE } from '@openweave/core/constants'
import { createEditor } from '@openweave/core/editor'
import type { Editor } from '@openweave/core/editor'
import { SceneGraph } from '@openweave/scene-graph'

describe('canvas ruler guides input', () => {
  function setupTestEditor(): Editor {
    const graph = new SceneGraph()
    const page = graph.addPage('Test Page')
    const editor = createEditor({ graph, skipInitialGraphSetup: true })
    editor.switchPage(page.id)
    return editor
  }

  test('starts dragging a horizontal guide from the top ruler', () => {
    const editor = setupTestEditor()
    let drag: DragState | null = null
    let cursor: string | null = null

    const started = tryStartGuideDrag(
      editor,
      100, // sx
      8, // sy <= RULER_SIZE
      100, // cx
      8, // cy
      (d) => {
        drag = d
      },
      (c) => {
        cursor = c
      }
    )

    expect(started).toBe(true)
    expect(drag).not.toBeNull()
    const guideDrag = drag as unknown as DragGuide
    expect(guideDrag.type).toBe('guide-drag')
    expect(guideDrag.axis).toBe('Y')
    expect(guideDrag.isNew).toBe(true)
    expect(cursor).toBe('row-resize')
    expect(editor.state.activeGuide).toEqual({ axis: 'Y', offset: 8 })
  })

  test('starts dragging a vertical guide from the left ruler', () => {
    const editor = setupTestEditor()
    let drag: DragState | null = null
    let cursor: string | null = null

    const started = tryStartGuideDrag(
      editor,
      10, // sx <= RULER_SIZE
      120, // sy > RULER_SIZE
      10, // cx
      120, // cy
      (d) => {
        drag = d
      },
      (c) => {
        cursor = c
      }
    )

    expect(started).toBe(true)
    expect(drag).not.toBeNull()
    const guideDrag = drag as unknown as DragGuide
    expect(guideDrag.type).toBe('guide-drag')
    expect(guideDrag.axis).toBe('X')
    expect(guideDrag.isNew).toBe(true)
    expect(cursor).toBe('col-resize')
    expect(editor.state.activeGuide).toEqual({ axis: 'X', offset: 10 })
  })

  test('moves guide and snaps with Shift key', () => {
    const editor = setupTestEditor()
    const d: DragGuide = {
      type: 'guide-drag',
      axis: 'X',
      currentOffset: 10,
      isNew: true
    }

    handleGuideDragMove(d, editor, 103, 100, false)
    expect(d.currentOffset).toBe(103)
    expect(editor.state.activeGuide).toEqual({ axis: 'X', offset: 103 })

    handleGuideDragMove(d, editor, 103, 100, true)
    // 103 snapped to nearest 8 is 104
    expect(d.currentOffset).toBe(104)
    expect(editor.state.activeGuide).toEqual({ axis: 'X', offset: 104 })
  })

  test('commits new guide to page on mouse up and supports undo/redo', () => {
    const editor = setupTestEditor()
    const d: DragGuide = {
      type: 'guide-drag',
      axis: 'Y',
      currentOffset: 150,
      isNew: true
    }

    handleGuideDragUp(d, editor, 100, 150) // sy > RULER_SIZE

    expect(editor.state.activeGuide).toBeNull()
    const guides = editor.getPageGuides()
    expect(guides).toHaveLength(1)
    expect(guides[0]).toEqual({ axis: 'Y', offset: 150 })

    // Test undo
    editor.undo.undo()
    expect(editor.getPageGuides()).toHaveLength(0)

    // Test redo
    editor.undo.redo()
    expect(editor.getPageGuides()).toHaveLength(1)
    expect(editor.getPageGuides()[0]).toEqual({ axis: 'Y', offset: 150 })
  })

  test('discards new guide if released back on the ruler', () => {
    const editor = setupTestEditor()
    const d: DragGuide = {
      type: 'guide-drag',
      axis: 'Y',
      currentOffset: 10,
      isNew: true
    }

    handleGuideDragUp(d, editor, 100, 5) // sy <= RULER_SIZE

    expect(editor.state.activeGuide).toBeNull()
    expect(editor.getPageGuides()).toHaveLength(0)
  })

  test('moves and deletes existing guide when dragged back to ruler', () => {
    const editor = setupTestEditor()
    editor.addPageGuide({ axis: 'X', offset: 200 })
    expect(editor.getPageGuides()).toHaveLength(1)

    // Hover detection
    const hovered = findHoveredGuide(editor, 201, 100, 1)
    expect(hovered).not.toBeNull()
    expect(hovered?.guide.offset).toBe(200)

    // Start dragging existing
    let drag: DragState | null = null
    tryStartGuideDrag(
      editor,
      201,
      100,
      201,
      100,
      (d) => {
        drag = d
      },
      () => {}
    )
    const guideDrag = drag as unknown as DragGuide
    expect(guideDrag.isNew).toBe(false)
    expect(guideDrag.guideIndex).toBe(0)

    // Drag back to left ruler and release
    handleGuideDragUp(guideDrag, editor, 5, 100) // sx <= RULER_SIZE
    expect(editor.getPageGuides()).toHaveLength(0)
  })
})
