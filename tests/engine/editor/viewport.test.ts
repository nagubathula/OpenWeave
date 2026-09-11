import { describe, test, expect } from 'bun:test'

import { createEditor } from '@openweave/core/editor'

describe('editor.zoomToNode', () => {
  function setup() {
    const editor = createEditor({
      getViewportSize: () => ({ width: 1000, height: 800 })
    })
    const pageId = editor.graph.getPages()[0].id
    const frame = editor.graph.createNode('FRAME', pageId, {
      name: 'Frame 1',
      x: 100,
      y: 150,
      width: 200,
      height: 200
    })
    return { editor, pageId, frame }
  }

  test('selects the node and updates viewport to fit the node', () => {
    const { editor, frame } = setup()

    expect(editor.state.selectedIds.size).toBe(0)
    const initialPanX = editor.state.panX
    const initialPanY = editor.state.panY

    editor.zoomToNode(frame.id)

    expect(editor.state.selectedIds.has(frame.id)).toBe(true)
    expect(editor.state.selectedIds.size).toBe(1)
    // Viewport pan/zoom should have updated
    expect(editor.state.panX).not.toBe(initialPanX)
    expect(editor.state.panY).not.toBe(initialPanY)
    expect(editor.state.zoom).toBeGreaterThan(0)
  })

  test('switches page if node belongs to another page', async () => {
    const { editor, pageId } = setup()

    const page2Id = editor.addPage('Page 2')
    const frameOnPage2 = editor.graph.createNode('FRAME', page2Id, {
      name: 'Frame on Page 2',
      x: 100,
      y: 100,
      width: 300,
      height: 300
    })

    // Switch back to first page
    await editor.switchPage(pageId)
    expect(editor.state.currentPageId).toBe(pageId)

    let pageChangedFired = false
    editor.onEditorEvent('page:changed', (newPageId, prevPageId) => {
      if (newPageId === page2Id && prevPageId === pageId) {
        pageChangedFired = true
      }
    })

    editor.zoomToNode(frameOnPage2.id)

    expect(editor.state.currentPageId).toBe(page2Id)
    expect(editor.state.selectedIds.has(frameOnPage2.id)).toBe(true)
    expect(pageChangedFired).toBe(true)
  })

  test('computes absolute coordinates for nested nodes', () => {
    const { editor, pageId } = setup()

    const parentFrame = editor.graph.createNode('FRAME', pageId, {
      name: 'Parent Frame',
      x: 500,
      y: 500,
      width: 400,
      height: 400
    })

    const childRect = editor.graph.createNode('RECTANGLE', parentFrame.id, {
      name: 'Child Rect',
      x: 50,
      y: 50,
      width: 100,
      height: 100
    })

    editor.zoomToNode(childRect.id)

    expect(editor.state.selectedIds.has(childRect.id)).toBe(true)
    expect(editor.state.selectedIds.size).toBe(1)
    expect(editor.state.zoom).toBeGreaterThan(0)
  })

  test('ignores nonexistent node ids gracefully without mutating state', () => {
    const { editor } = setup()

    const initialZoom = editor.state.zoom
    const initialPanX = editor.state.panX
    const initialPanY = editor.state.panY

    editor.zoomToNode('non-existent-id')

    expect(editor.state.selectedIds.size).toBe(0)
    expect(editor.state.zoom).toBe(initialZoom)
    expect(editor.state.panX).toBe(initialPanX)
    expect(editor.state.panY).toBe(initialPanY)
  })

  test('emits viewport:changed event when zooming to node', () => {
    const { editor, frame } = setup()

    let viewportChangedFired = false
    editor.onEditorEvent('viewport:changed', () => {
      viewportChangedFired = true
    })

    editor.zoomToNode(frame.id)
    expect(viewportChangedFired).toBe(true)
  })
})
