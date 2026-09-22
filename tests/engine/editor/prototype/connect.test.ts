import { describe, expect, test } from 'bun:test'

import { createEditor } from '@openweave/core/editor'
import {
  finishPrototypeConnect,
  handlePrototypeConnectMove,
  startPrototypeConnect
} from '@openweave/react'

describe('prototype connector interaction', () => {
  test('dragging connector to another top-level frame creates NAVIGATE reaction', () => {
    const editor = createEditor()
    const pageId = editor.state.currentPageId
    editor.state.prototypeMode = true

    const frameA = editor.graph.createNode('FRAME', pageId, {
      name: 'Screen A',
      x: 0,
      y: 0,
      width: 300,
      height: 600
    })
    const btn = editor.graph.createNode('RECTANGLE', frameA.id, {
      name: 'Go to B',
      x: 20,
      y: 50,
      width: 100,
      height: 40
    })
    const frameB = editor.graph.createNode('FRAME', pageId, {
      name: 'Screen B',
      x: 400,
      y: 0,
      width: 300,
      height: 600
    })

    editor.select([btn.id])
    let claimedDrag: unknown = null
    // Handle at right edge of btn: x = 120, y = 70
    const started = startPrototypeConnect(120, 70, editor, (drag) => {
      claimedDrag = drag
    })
    expect(started).toBe(true)
    expect(claimedDrag).toEqual({ type: 'proto-connect', sourceId: btn.id })

    // Move over frame B (e.g. x: 500, y: 300)
    handlePrototypeConnectMove({ type: 'proto-connect', sourceId: btn.id }, 500, 300, editor)
    expect(editor.state.prototypeDrag).toEqual({ sourceId: btn.id, cursorX: 500, cursorY: 300 })

    // Finish connection
    finishPrototypeConnect({ type: 'proto-connect', sourceId: btn.id }, editor)
    expect(editor.state.prototypeDrag).toBeNull()

    const updatedBtn = editor.graph.getNode(btn.id)
    expect(updatedBtn?.reactions).toHaveLength(1)
    const reaction = updatedBtn?.reactions[0]
    expect(reaction?.action).toBe('NAVIGATE')
    expect(reaction?.destinationId).toBe(frameB.id)
    expect(reaction?.trigger).toBe('ON_CLICK')
  })

  test('dragging connector to variant component in component set creates CHANGE_TO reaction', () => {
    const editor = createEditor()
    const pageId = editor.state.currentPageId
    editor.state.prototypeMode = true

    const componentSet = editor.graph.createNode('COMPONENT_SET', pageId, {
      name: 'Switch',
      x: 0,
      y: 0,
      width: 200,
      height: 80
    })
    const varOff = editor.graph.createNode('COMPONENT', componentSet.id, {
      name: 'State=Off',
      x: 0,
      y: 0,
      width: 80,
      height: 40
    })
    const varOn = editor.graph.createNode('COMPONENT', componentSet.id, {
      name: 'State=On',
      x: 100,
      y: 0,
      width: 80,
      height: 40
    })

    editor.state.prototypeDrag = { sourceId: varOff.id, cursorX: 140, cursorY: 20 }
    finishPrototypeConnect({ type: 'proto-connect', sourceId: varOff.id }, editor)

    const updatedVarOff = editor.graph.getNode(varOff.id)
    expect(updatedVarOff?.reactions).toHaveLength(1)
    const reaction = updatedVarOff?.reactions[0]
    expect(reaction?.action).toBe('CHANGE_TO')
    expect(reaction?.destinationId).toBe(varOn.id)
    expect(reaction?.trigger).toBe('ON_CLICK')
    expect(reaction?.transition).toBe('SMART_ANIMATE')
    expect(reaction?.easing).toBe('SPRING')
  })

  test('dropping outside any target cancels drag without creating reaction', () => {
    const editor = createEditor()
    const pageId = editor.state.currentPageId
    editor.state.prototypeMode = true

    const frameA = editor.graph.createNode('FRAME', pageId, {
      name: 'Screen A',
      x: 0,
      y: 0,
      width: 200,
      height: 200
    })

    editor.state.prototypeDrag = { sourceId: frameA.id, cursorX: 9999, cursorY: 9999 }
    finishPrototypeConnect({ type: 'proto-connect', sourceId: frameA.id }, editor)

    const updatedFrameA = editor.graph.getNode(frameA.id)
    expect(updatedFrameA?.reactions).toHaveLength(0)
    expect(editor.state.prototypeDrag).toBeNull()
  })
})
