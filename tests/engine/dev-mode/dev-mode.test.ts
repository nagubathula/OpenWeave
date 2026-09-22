import { describe, expect, it } from 'bun:test'

import type { Canvas } from 'canvaskit-wasm'

import { drawDistanceMeasurements, type SkiaRenderer } from '@openweave/core/canvas'
import { createEditor } from '@openweave/core/editor'
import { SceneGraph } from '@openweave/scene-graph'

import { generateNodeCSS } from '@/components/dev-mode/codegen'

describe('Dev Mode & Redline Annotations', () => {
  it('editor.setDevMode toggles devMode in editor state', () => {
    const editor = createEditor()
    expect(editor.state.devMode).toBe(false)

    editor.setDevMode(true)
    expect(editor.state.devMode).toBe(true)

    editor.setDevMode(false)
    expect(editor.state.devMode).toBe(false)
  })

  it('generateNodeCSS creates CSS rules with flexbox layout, dimensions, and styling', () => {
    const graph = new SceneGraph()
    const page = graph.getPages()[0]

    const card = graph.createNode('FRAME', page.id, {
      name: 'CardContainer',
      width: 320,
      height: 240,
      layoutMode: 'VERTICAL',
      itemSpacing: 16,
      paddingTop: 24,
      paddingRight: 24,
      paddingBottom: 24,
      paddingLeft: 24,
      primaryAxisAlign: 'CENTER',
      counterAxisAlign: 'CENTER',
      cornerRadius: 12,
      fills: [{ type: 'SOLID', color: { r: 0.1, g: 0.15, b: 0.2, a: 1 } }],
      strokes: [
        {
          color: { r: 0.2, g: 0.3, b: 0.4, a: 1 },
          weight: 2,
          visible: true,
          opacity: 1,
          align: 'INSIDE'
        }
      ]
    })

    const css = generateNodeCSS(card, graph)
    expect(css).toContain('.cardcontainer {')
    expect(css).toContain('width: 320px;')
    expect(css).toContain('height: 240px;')
    expect(css).toContain('display: flex;')
    expect(css).toContain('flex-direction: column;')
    expect(css).toContain('gap: 16px;')
    expect(css).toContain('padding: 24px;')
    expect(css).toContain('border-radius: 12px;')
    expect(css).toContain('border: 2px solid')
  })

  it('generateNodeCSS resolves bound variable tokens into CSS var syntax', () => {
    const graph = new SceneGraph()
    const page = graph.getPages()[0]

    // Create a color variable
    graph.variables.set('var-color-primary', {
      id: 'var-color-primary',
      name: 'color/primary',
      collectionId: 'coll-1',
      type: 'COLOR',
      valuesByMode: {
        default: { r: 0.2, g: 0.4, b: 0.8, a: 1 }
      },
      description: '',
      hiddenFromPublishing: false
    })

    const btn = graph.createNode('FRAME', page.id, {
      name: 'PrimaryBtn',
      width: 140,
      height: 48,
      boundVariables: {
        'fills/0/color': 'var-color-primary'
      },
      fills: [{ type: 'SOLID', color: { r: 0.2, g: 0.4, b: 0.8, a: 1 } }]
    })

    const css = generateNodeCSS(btn, graph)
    expect(css).toContain('background: var(--color-primary);')
  })

  it('drawDistanceMeasurements renders redlines in Dev Mode without altHeld', () => {
    const graph = new SceneGraph()
    const page = graph.getPages()[0]

    const boxA = graph.createNode('RECTANGLE', page.id, {
      x: 0,
      y: 0,
      width: 100,
      height: 100
    })

    const boxB = graph.createNode('RECTANGLE', page.id, {
      x: 150,
      y: 0,
      width: 100,
      height: 100
    })

    const linesDrawn: Array<{ x1: number; y1: number; x2: number; y2: number }> = []
    const rectsDrawn: Float32Array[] = []

    const mockCanvas = {
      drawRect: (rect: Float32Array) => {
        rectsDrawn.push(rect)
      },
      drawLine: (x1: number, y1: number, x2: number, y2: number) => {
        linesDrawn.push({ x1, y1, x2, y2 })
      },
      drawRRect: () => {},
      drawText: () => {}
    } as unknown as Canvas

    const mockRenderer = {
      zoom: 1,
      panX: 0,
      panY: 0,
      ck: {
        LTRBRect: (l: number, t: number, r: number, b: number) => new Float32Array([l, t, r, b]),
        RRectXY: (rect: Float32Array) => rect,
        WHITE: new Float32Array([1, 1, 1, 1])
      },
      snapPaint: {},
      snapDashPaint: {},
      snapFill: {},
      redlinePaint: {},
      redlineDashPaint: {},
      redlineFill: {},
      auxFill: { setColor: () => {} }
    } as unknown as SkiaRenderer

    // 1. Without altHeld and without devMode -> nothing drawn
    drawDistanceMeasurements(mockRenderer, mockCanvas, graph, new Set([boxA.id]), {
      hoveredNodeId: boxB.id,
      altHeld: false,
      devMode: false
    })
    expect(rectsDrawn.length).toBe(0)
    expect(linesDrawn.length).toBe(0)

    // 2. With devMode: true -> distance redline guides are computed and drawn
    drawDistanceMeasurements(mockRenderer, mockCanvas, graph, new Set([boxA.id]), {
      hoveredNodeId: boxB.id,
      altHeld: false,
      devMode: true
    })
    expect(rectsDrawn.length).toBeGreaterThan(0)
    expect(linesDrawn.length).toBeGreaterThan(0)
  })
})
