import { describe, expect, test } from 'bun:test'

import {
  FIGMA_SPRING_PRESETS,
  getSpringCssEasing,
  getSpringSettlingDuration,
  interpolateBounds,
  matchLayers,
  PROTOTYPE_EASING_CSS,
  PrototypeEvaluator,
  solveSpringDisplacement,
  springToCubicBezier
} from '@openweave/core/editor'
import { SceneGraph } from '@openweave/scene-graph'

describe('prototype smart animate & layer matching', () => {
  test('matches layers by name and type across frames', () => {
    const graph = new SceneGraph()
    const page = graph.createNode('PAGE', null, { name: 'Page 1' })

    const frameA = graph.createNode('FRAME', page.id, {
      name: 'Frame A',
      x: 0,
      y: 0,
      width: 400,
      height: 600
    })
    const buttonA = graph.createNode('RECTANGLE', frameA.id, {
      name: 'PrimaryButton',
      x: 50,
      y: 100,
      width: 200,
      height: 50,
      cornerRadius: 8
    })
    graph.createNode('TEXT', frameA.id, {
      name: 'Subtitle',
      x: 50,
      y: 200,
      width: 150,
      height: 30
    })

    const frameB = graph.createNode('FRAME', page.id, {
      name: 'Frame B',
      x: 500,
      y: 0,
      width: 400,
      height: 600
    })
    const buttonB = graph.createNode('RECTANGLE', frameB.id, {
      name: 'PrimaryButton',
      x: 50,
      y: 400, // Moved down
      width: 300, // Expanded
      height: 60,
      cornerRadius: 16
    })
    graph.createNode('ELLIPSE', frameB.id, {
      name: 'Avatar',
      x: 100,
      y: 50,
      width: 64,
      height: 64
    })

    const plan = matchLayers(graph, frameA.id, frameB.id)

    expect(plan.matches).toHaveLength(1)
    expect(plan.matches[0].source.id).toBe(buttonA.id)
    expect(plan.matches[0].destination.id).toBe(buttonB.id)
    expect(plan.matches[0].source.y).toBe(100)
    expect(plan.matches[0].destination.y).toBe(400)
    expect(plan.matches[0].source.width).toBe(200)
    expect(plan.matches[0].destination.width).toBe(300)

    expect(plan.sourceOnly.map((n) => n.name)).toEqual(['Subtitle'])
    expect(plan.destinationOnly.map((n) => n.name)).toEqual(['Avatar'])
  })

  test('interpolates node bounds smoothly', () => {
    const source = {
      id: 'src',
      name: 'Box',
      type: 'RECTANGLE',
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      opacity: 1,
      rotation: 0,
      cornerRadius: 0
    }
    const dest = {
      id: 'dest',
      name: 'Box',
      type: 'RECTANGLE',
      x: 100,
      y: 200,
      width: 200,
      height: 300,
      opacity: 0.5,
      rotation: 90,
      cornerRadius: 20
    }

    const mid = interpolateBounds(source, dest, 0.5)
    expect(mid.x).toBe(50)
    expect(mid.y).toBe(100)
    expect(mid.width).toBe(150)
    expect(mid.height).toBe(200)
    expect(mid.opacity).toBe(0.75)
    expect(mid.rotation).toBe(45)
    expect(mid.cornerRadius).toBe(10)
  })

  test('provides spring and bezier easing curves', () => {
    expect(PROTOTYPE_EASING_CSS.SPRING).toContain('cubic-bezier')
    expect(PROTOTYPE_EASING_CSS.EASE_IN_AND_OUT).toBe('cubic-bezier(0.4, 0, 0.2, 1)')
  })

  test('evaluates expressions and conditions via PrototypeEvaluator', () => {
    const vars = new Map<string, any>([
      ['var:count', 5],
      ['var:active', true]
    ])
    const evaluator = new PrototypeEvaluator(vars, (id) =>
      id === 'var:count' ? 'Count' : undefined
    )

    expect(evaluator.evaluate('var:count + 3')).toBe(8)
    expect(evaluator.evaluate('#Count * 2')).toBe(10)
    expect(evaluator.evaluate('var:count > 3 && var:active')).toBe(true)
    expect(evaluator.evaluate('var:count = 5')).toBe(true)
  })

  test('solves spring physics displacement and settling duration accurately', () => {
    // At t=0, displacement is 0
    expect(solveSpringDisplacement(FIGMA_SPRING_PRESETS.BOUNCY, 0)).toBe(0)

    // Underdamped BOUNCY preset should overshoot 1.0 at peak
    let maxDisplacement = 0
    for (let t = 0.01; t <= 0.5; t += 0.01) {
      const y = solveSpringDisplacement(FIGMA_SPRING_PRESETS.BOUNCY, t)
      if (y > maxDisplacement) maxDisplacement = y
    }
    expect(maxDisplacement).toBeGreaterThan(1.1)

    // At late time (e.g. t = 2.0s), bouncy spring should settle very close to 1.0
    const settled = solveSpringDisplacement(FIGMA_SPRING_PRESETS.BOUNCY, 2.0)
    expect(settled).toBeGreaterThan(0.98)
    expect(settled).toBeLessThan(1.02)

    // Settling durations should be positive and bounded
    const bouncyDuration = getSpringSettlingDuration(FIGMA_SPRING_PRESETS.BOUNCY)
    const gentleDuration = getSpringSettlingDuration(FIGMA_SPRING_PRESETS.GENTLE)
    expect(bouncyDuration).toBeGreaterThan(200)
    expect(gentleDuration).toBeGreaterThan(200)

    // CSS cubic bezier outputs
    expect(springToCubicBezier(FIGMA_SPRING_PRESETS.BOUNCY)).toContain('cubic-bezier')
    expect(getSpringCssEasing('BOUNCY')).toContain('cubic-bezier')
    expect(getSpringCssEasing('GENTLE')).toContain('cubic-bezier')
  })
})
