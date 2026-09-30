import { describe, expect, test } from 'bun:test'

import { createEditor } from '@openweave/core/editor'

describe('Curvature Pen Tool', () => {
  test('creates a smooth 4-point circle with circular arc tangents', () => {
    const editor = createEditor({ getViewportSize: () => ({ width: 1000, height: 1000 }) })
    editor.setTool('CURVATURE_PEN')

    // 4 points on a circle with center (150, 150) and radius 150:
    // Top (150, 0), Right (300, 150), Bottom (150, 300), Left (0, 150)
    editor.penAddSmoothVertex(150, 0)
    editor.penAddSmoothVertex(300, 150)
    editor.penAddSmoothVertex(150, 300)
    editor.penAddSmoothVertex(0, 150)

    // Close the curve back to vertex 0
    editor.penSetPendingClose(true)
    editor.penCommit(true)

    const page = editor.graph.getPages()[0]
    const nodes = editor.graph.getChildren(page.id)
    expect(nodes.length).toBe(1)

    const vectorNode = nodes[0]
    expect(vectorNode.type).toBe('VECTOR')
    const network = vectorNode.vectorNetwork
    expect(network).toBeDefined()
    expect(network?.vertices.length).toBe(4)
    expect(network?.segments.length).toBe(4)

    // Expected ideal handle length for radius 150 quarter circle:
    // kappa = 4/3 * (sqrt(2) - 1) * 150 ≈ 82.8427
    const expectedKappa = (4 / 3) * (Math.SQRT2 - 1) * 150

    // Top to Right segment (segment 0):
    // tangentStart should be (+kappa, 0) pointing right
    // tangentEnd should be (0, -kappa) pointing up
    const seg0 = network?.segments[0]
    expect(seg0).toBeDefined()
    expect(seg0?.tangentStart.x).toBeCloseTo(expectedKappa, 0)
    expect(seg0?.tangentStart.y).toBeCloseTo(0, 0)
    expect(seg0?.tangentEnd.x).toBeCloseTo(0, 0)
    expect(seg0?.tangentEnd.y).toBeCloseTo(-expectedKappa, 0)

    // Right to Bottom segment (segment 1):
    // tangentStart should be (0, +kappa) pointing down
    // tangentEnd should be (+kappa, 0) pointing right
    const seg1 = network?.segments[1]
    expect(seg1).toBeDefined()
    expect(seg1?.tangentStart.x).toBeCloseTo(0, 0)
    expect(seg1?.tangentStart.y).toBeCloseTo(expectedKappa, 0)
    expect(seg1?.tangentEnd.x).toBeCloseTo(expectedKappa, 0)
    expect(seg1?.tangentEnd.y).toBeCloseTo(0, 0)
  })

  test('keeps 2-point curvature path straight', () => {
    const editor = createEditor({ getViewportSize: () => ({ width: 1000, height: 1000 }) })
    editor.setTool('CURVATURE_PEN')

    editor.penAddSmoothVertex(100, 100)
    editor.penAddSmoothVertex(300, 100)
    editor.penCommit(false)

    const page = editor.graph.getPages()[0]
    const vectorNode = editor.graph.getChildren(page.id)[0]
    const network = vectorNode.vectorNetwork
    expect(network?.vertices.length).toBe(2)
    expect(network?.segments.length).toBe(1)

    // 2-point open path should have 0 tangents (straight line)
    const seg = network?.segments[0]
    expect(seg?.tangentStart.x).toBe(0)
    expect(seg?.tangentStart.y).toBe(0)
    expect(seg?.tangentEnd.x).toBe(0)
    expect(seg?.tangentEnd.y).toBe(0)
  })

  test('fits a 3-point circular arc with tangent continuity', () => {
    const editor = createEditor({ getViewportSize: () => ({ width: 1000, height: 1000 }) })
    editor.setTool('CURVATURE_PEN')

    // 3 points on a semi-circle of radius 100 around (100, 100):
    // P0 = (0, 100), P1 = (100, 0), P2 = (200, 100)
    editor.penAddSmoothVertex(0, 100)
    editor.penAddSmoothVertex(100, 0)
    editor.penAddSmoothVertex(200, 100)
    editor.penCommit(false)

    const page = editor.graph.getPages()[0]
    const vectorNode = editor.graph.getChildren(page.id)[0]
    const network = vectorNode.vectorNetwork
    expect(network?.vertices.length).toBe(3)
    expect(network?.segments.length).toBe(2)

    // Segment 0: (0, 100) -> (100, 0)
    // At P1 (100, 0), apex of circle, tangent must be horizontal (y = 0)
    const seg0 = network?.segments[0]
    const seg1 = network?.segments[1]
    expect(seg0).toBeDefined()
    expect(seg1).toBeDefined()

    // Tangent incoming at P1: pointing left (-x, 0)
    expect(seg0?.tangentEnd.y).toBeCloseTo(0, 1)
    expect(seg0?.tangentEnd.x).toBeLessThan(0)

    // Tangent outgoing at P1: pointing right (+x, 0)
    expect(seg1?.tangentStart.y).toBeCloseTo(0, 1)
    expect(seg1?.tangentStart.x).toBeGreaterThan(0)

    // Tangents at P1 should be symmetric in magnitude
    expect(Math.abs(seg0?.tangentEnd.x ?? 0)).toBeCloseTo(seg1?.tangentStart.x ?? 0, 1)
  })

  test('keeps 3 collinear points straight', () => {
    const editor = createEditor({ getViewportSize: () => ({ width: 1000, height: 1000 }) })
    editor.setTool('CURVATURE_PEN')

    editor.penAddSmoothVertex(0, 50)
    editor.penAddSmoothVertex(50, 50)
    editor.penAddSmoothVertex(100, 50)
    editor.penCommit(false)

    const page = editor.graph.getPages()[0]
    const vectorNode = editor.graph.getChildren(page.id)[0]
    const network = vectorNode.vectorNetwork
    expect(network?.vertices.length).toBe(3)
    expect(network?.segments.length).toBe(2)

    // Tangents along horizontal line should have y = 0 (no vertical bowing)
    for (const seg of network?.segments ?? []) {
      expect(seg.tangentStart.y).toBeCloseTo(0, 2)
      expect(seg.tangentEnd.y).toBeCloseTo(0, 2)
    }
  })

  test('updates speculative preview tangent during hover', () => {
    const editor = createEditor({ getViewportSize: () => ({ width: 1000, height: 1000 }) })
    editor.setTool('CURVATURE_PEN')

    editor.penAddSmoothVertex(0, 100)
    editor.penAddSmoothVertex(100, 0)

    // Before preview, dragTangent is null
    expect(editor.state.penState?.dragTangent).toBeNull()

    // Hover at (200, 100) should compute a preview tangent pointing smoothly
    editor.penPreviewSmoothTangent(200, 100)

    expect(editor.state.penState?.dragTangent).not.toBeNull()
    const dt = editor.state.penState?.dragTangent
    // Tangent at vertex 1 (100, 0) pointing towards (200, 100) should be horizontal (+x, ~0y)
    expect(dt?.x).toBeGreaterThan(0)
    expect(dt?.y).toBeCloseTo(0, 1)
  })
})
