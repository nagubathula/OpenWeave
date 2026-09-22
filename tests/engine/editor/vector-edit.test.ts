import { describe, test, expect } from 'bun:test'

import { createEditor } from '@openweave/core/editor'
import { bendSegment, toggleVertexSmooth } from '@openweave/core/vector'
import { SceneGraph, type VectorNetwork } from '@openweave/scene-graph'

import { createVectorEditActions } from '@/app/editor/vector-edit'
import type { VectorEditState } from '@/app/editor/vector-edit/types'

describe('vector network math: bendSegment & toggleVertexSmooth', () => {
  const lineNetwork: VectorNetwork = {
    vertices: [
      { x: 0, y: 0, handleMirroring: 'NONE' },
      { x: 100, y: 0, handleMirroring: 'NONE' }
    ],
    segments: [{ start: 0, end: 1, tangentStart: { x: 0, y: 0 }, tangentEnd: { x: 0, y: 0 } }],
    regions: []
  }

  test('bendSegment bends a straight segment into a cubic curve', () => {
    const bent = bendSegment(
      lineNetwork,
      0,
      0.5,
      { x: 50, y: 30 },
      { x: 0, y: 0 },
      { x: 0, y: 0 },
      { x: 50, y: 0 }
    )

    expect(bent.segments[0].tangentStart.y).toBeGreaterThan(0)
    expect(bent.segments[0].tangentEnd.y).toBeGreaterThan(0)
    expect(bent.segments[0].tangentStart.x).toBe(0)
  })

  test('toggleVertexSmooth toggles between sharp and smooth handles', () => {
    const triangleNetwork: VectorNetwork = {
      vertices: [
        { x: 0, y: 0, handleMirroring: 'NONE' },
        { x: 50, y: 50, handleMirroring: 'NONE' },
        { x: 100, y: 0, handleMirroring: 'NONE' }
      ],
      segments: [
        { start: 0, end: 1, tangentStart: { x: 0, y: 0 }, tangentEnd: { x: 0, y: 0 } },
        { start: 1, end: 2, tangentStart: { x: 0, y: 0 }, tangentEnd: { x: 0, y: 0 } }
      ],
      regions: []
    }

    // 1. Initially sharp at vertex 1: toggle creates smooth handles
    const smoothed = toggleVertexSmooth(triangleNetwork, 1)
    expect(smoothed.vertices[1].handleMirroring).toBe('ANGLE_AND_LENGTH')
    const seg0 = smoothed.segments[0]
    const seg1 = smoothed.segments[1]
    const h0Len = Math.hypot(seg0.tangentEnd.x, seg0.tangentEnd.y)
    const h1Len = Math.hypot(seg1.tangentStart.x, seg1.tangentStart.y)
    expect(h0Len).toBeGreaterThan(0)
    expect(h1Len).toBeGreaterThan(0)

    // 2. Smooth vertex: toggle zeroes handles (sharp corner)
    const sharpAgain = toggleVertexSmooth(smoothed, 1)
    expect(sharpAgain.vertices[1].handleMirroring).toBe('NONE')
    expect(sharpAgain.segments[0].tangentEnd).toEqual({ x: 0, y: 0 })
    expect(sharpAgain.segments[1].tangentStart).toEqual({ x: 0, y: 0 })
  })
})

describe('vector edit mode lifecycle and shape conversion', () => {
  test('entering edit mode converts RECTANGLE to VECTOR with vectorNetwork', () => {
    const graph = new SceneGraph()
    const pageId = graph.getPages()[0].id
    const rect = graph.createNode('RECTANGLE', pageId, {
      x: 20,
      y: 30,
      width: 120,
      height: 80
    })

    const editor = createEditor({ graph })
    const state = editor.state as VectorEditState
    state.nodeEditState = null
    const actions = createVectorEditActions(editor, state)

    actions.enterNodeEditMode(rect.id)
    const es = actions.getNodeEditState()
    expect(es).not.toBeNull()
    expect(es?.vertices.length).toBe(4)
    expect(es?.segments.length).toBe(4)

    const updatedNode = graph.getNode(rect.id)
    expect(updatedNode?.type).toBe('VECTOR')
    expect(updatedNode?.vectorNetwork).not.toBeNull()

    actions.exitNodeEditMode(true)
    expect(actions.getNodeEditState()).toBeNull()
  })

  test('entering edit mode converts ELLIPSE to smooth VECTOR network', () => {
    const graph = new SceneGraph()
    const pageId = graph.getPages()[0].id
    const ellipse = graph.createNode('ELLIPSE', pageId, {
      x: 0,
      y: 0,
      width: 100,
      height: 100
    })

    const editor = createEditor({ graph })
    const state = editor.state as VectorEditState
    state.nodeEditState = null
    const actions = createVectorEditActions(editor, state)

    actions.enterNodeEditMode(ellipse.id)
    const es = actions.getNodeEditState()
    expect(es).not.toBeNull()
    expect(es?.vertices.length).toBe(4)
    expect(es?.segments.length).toBe(4)
    expect(
      Math.hypot(es!.segments[0].tangentStart.x, es!.segments[0].tangentStart.y)
    ).toBeGreaterThan(0)

    actions.exitNodeEditMode(true)
  })

  test('split segment adds vertex, bendSegment bends, and undo restores', () => {
    const graph = new SceneGraph()
    const pageId = graph.getPages()[0].id
    const vector = graph.createNode('VECTOR', pageId, {
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      vectorNetwork: {
        vertices: [
          { x: 0, y: 0 },
          { x: 100, y: 0 }
        ],
        segments: [{ start: 0, end: 1, tangentStart: { x: 0, y: 0 }, tangentEnd: { x: 0, y: 0 } }],
        regions: []
      }
    })

    const editor = createEditor({ graph })
    const state = editor.state as VectorEditState
    state.nodeEditState = null
    const actions = createVectorEditActions(editor, state)

    actions.enterNodeEditMode(vector.id)
    const es = actions.getNodeEditState()
    expect(es).not.toBeNull()
    expect(es?.vertices.length).toBe(2)

    // Add vertex at (50, 0)
    actions.nodeEditAddVertex(50, 0)
    expect(es?.vertices.length).toBe(3)
    expect(es?.segments.length).toBe(2)

    // Bend segment
    actions.nodeEditBendSegment(
      0,
      0.5,
      { x: 25, y: 20 },
      { x: 0, y: 0 },
      { x: 0, y: 0 },
      { x: 25, y: 0 }
    )
    expect(es?.segments[0].tangentStart.y).toBeGreaterThan(0)

    // Undo restores previous geometry
    actions.nodeEditUndo()
    expect(es?.vertices.length).toBe(2)
    expect(es?.segments.length).toBe(1)

    // Redo re-applies
    actions.nodeEditRedo()
    expect(es?.vertices.length).toBe(3)
    expect(es?.segments.length).toBe(2)

    actions.exitNodeEditMode(true)
    const committed = graph.getNode(vector.id)
    expect(committed?.vectorNetwork?.vertices.length).toBe(3)
  })
})
