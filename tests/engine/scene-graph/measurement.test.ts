import { describe, expect, test } from 'bun:test'

import { computeDistanceGuides } from '@openweave/scene-graph'

describe('computeDistanceGuides', () => {
  test('returns 4 inner distances when target contains selection', () => {
    // Container at (0, 0) size 400x300.
    // Child at (50, 40) size 100x60.
    const target = { x: 0, y: 0, width: 400, height: 300 }
    const selected = { x: 50, y: 40, width: 100, height: 60 }

    const guides = computeDistanceGuides(selected, target)
    expect(guides).toHaveLength(4)

    const top = guides.find((g) => g.axis === 'y' && g.start === 0 && g.end === 40)
    expect(top?.distance).toBe(40)
    expect(top?.crossPosition).toBe(100) // selected center X

    const bottom = guides.find((g) => g.axis === 'y' && g.start === 100 && g.end === 300)
    expect(bottom?.distance).toBe(200)

    const left = guides.find((g) => g.axis === 'x' && g.start === 0 && g.end === 50)
    expect(left?.distance).toBe(50)
    expect(left?.crossPosition).toBe(70) // selected center Y

    const right = guides.find((g) => g.axis === 'x' && g.start === 150 && g.end === 400)
    expect(right?.distance).toBe(250)
  })

  test('returns 4 inner distances when selection contains target', () => {
    const selected = { x: 0, y: 0, width: 200, height: 200 }
    const target = { x: 50, y: 50, width: 50, height: 50 }

    const guides = computeDistanceGuides(selected, target)
    expect(guides).toHaveLength(4)

    const top = guides.find((g) => g.axis === 'y' && g.start === 0 && g.end === 50)
    expect(top?.distance).toBe(50)
    expect(top?.crossPosition).toBe(75) // target center X
  })

  test('returns horizontal distance when disjoint side-by-side with Y overlap', () => {
    // S at (100, 100) 50x50, T at (200, 120) 50x50. Gap is 50 horizontally.
    const selected = { x: 100, y: 100, width: 50, height: 50 }
    const target = { x: 200, y: 120, width: 50, height: 50 }

    const guides = computeDistanceGuides(selected, target)
    expect(guides).toHaveLength(1)
    expect(guides[0].axis).toBe('x')
    expect(guides[0].distance).toBe(50)
    expect(guides[0].start).toBe(150)
    expect(guides[0].end).toBe(200)
    expect(guides[0].crossPosition).toBe(135) // overlap midpoint (120+150)/2
    expect(guides[0].projection).toBeUndefined()
  })

  test('returns vertical distance when disjoint stacked with X overlap', () => {
    // S at (100, 100) 80x50, T at (120, 200) 80x50. Gap is 50 vertically.
    const selected = { x: 100, y: 100, width: 80, height: 50 }
    const target = { x: 120, y: 200, width: 80, height: 50 }

    const guides = computeDistanceGuides(selected, target)
    expect(guides).toHaveLength(1)
    expect(guides[0].axis).toBe('y')
    expect(guides[0].distance).toBe(50)
    expect(guides[0].start).toBe(150)
    expect(guides[0].end).toBe(200)
    expect(guides[0].crossPosition).toBe(150) // overlap midpoint (120+180)/2
    expect(guides[0].projection).toBeUndefined()
  })

  test('generates perpendicular projections when disjoint diagonally', () => {
    // S at (0, 0) 50x50. T at (100, 100) 50x50.
    const selected = { x: 0, y: 0, width: 50, height: 50 }
    const target = { x: 100, y: 100, width: 50, height: 50 }

    const guides = computeDistanceGuides(selected, target)
    expect(guides).toHaveLength(2)

    const xGuide = guides.find((g) => g.axis === 'x')
    expect(xGuide).toBeDefined()
    expect(xGuide?.distance).toBe(50)
    expect(xGuide?.start).toBe(50)
    expect(xGuide?.end).toBe(100)
    expect(xGuide?.projection).toEqual({
      axis: 'y',
      position: 100,
      from: 25,
      to: 100
    })

    const yGuide = guides.find((g) => g.axis === 'y')
    expect(yGuide).toBeDefined()
    expect(yGuide?.distance).toBe(50)
    expect(yGuide?.start).toBe(50)
    expect(yGuide?.end).toBe(100)
    expect(yGuide?.projection).toEqual({
      axis: 'x',
      position: 100,
      from: 25,
      to: 100
    })
  })
})
