import { describe, expect, test } from 'bun:test'

import {
  computeCornerRadiusFromPointer,
  hitTestCornerRadius,
  nodeSupportsCornerRadius
} from '#react/shared/input/select/corner-radius'

import type { Editor } from '@openweave/core/editor'
import type { SceneNode } from '@openweave/scene-graph'

function createRectangle(overrides: Partial<SceneNode> = {}): SceneNode {
  return {
    id: 'rect-1',
    type: 'RECTANGLE',
    name: 'Rectangle',
    parentId: 'page',
    childIds: [],
    visible: true,
    locked: false,
    x: 100,
    y: 100,
    width: 200,
    height: 120,
    rotation: 0,
    cornerRadius: 0,
    topLeftRadius: 0,
    topRightRadius: 0,
    bottomRightRadius: 0,
    bottomLeftRadius: 0,
    independentCorners: false,
    ...overrides
  } as SceneNode
}

function mockEditor(node: SceneNode, zoom = 1): Editor {
  const nodes = new Map<string, SceneNode>([[node.id, node]])
  return {
    state: {
      selectedIds: new Set([node.id]),
      zoom
    },
    graph: {
      getNode: (id: string) => nodes.get(id),
      getAbsolutePosition: () => ({ x: node.x, y: node.y }),
      rootId: 'root'
    }
  } as unknown as Editor
}

describe('corner radius direct manipulation', () => {
  test('nodeSupportsCornerRadius identifies supported node types', () => {
    expect(nodeSupportsCornerRadius({ type: 'RECTANGLE' } as SceneNode)).toBe(true)
    expect(nodeSupportsCornerRadius({ type: 'FRAME' } as SceneNode)).toBe(true)
    expect(nodeSupportsCornerRadius({ type: 'COMPONENT' } as SceneNode)).toBe(true)
    expect(nodeSupportsCornerRadius({ type: 'INSTANCE' } as SceneNode)).toBe(true)
    expect(nodeSupportsCornerRadius({ type: 'TEXT' } as SceneNode)).toBe(false)
    expect(nodeSupportsCornerRadius({ type: 'LINE' } as SceneNode)).toBe(false)
  })

  test('hitTestCornerRadius detects top-left handle', () => {
    const node = createRectangle({ x: 100, y: 100, width: 200, height: 120, cornerRadius: 0 })
    const editor = mockEditor(node)

    // With cornerRadius 0, top-left handle is at (100 + 12, 100 + 12) = (112, 112)
    const hit = hitTestCornerRadius(112, 112, editor)
    expect(hit).not.toBeNull()
    expect(hit?.corner).toBe('tl')
    expect(hit?.nodeId).toBe('rect-1')
  })

  test('hitTestCornerRadius ignores nodes when screen dimensions are too small', () => {
    const node = createRectangle({ x: 0, y: 0, width: 20, height: 20 })
    const editor = mockEditor(node, 1) // 20 * 1 = 20 < 36
    expect(hitTestCornerRadius(10, 10, editor)).toBeNull()
  })

  test('computeCornerRadiusFromPointer computes uniform corner radius', () => {
    const node = createRectangle({ x: 0, y: 0, width: 200, height: 100, cornerRadius: 0 })
    const editor = mockEditor(node)

    // Dragging TL towards center: pointer at (20, 20)
    const result = computeCornerRadiusFromPointer(node, 'tl', 20, 20, editor, false, false)
    expect(result.radius).toBe(20)
    expect(result.updates.cornerRadius).toBe(20)
    expect(result.updates.independentCorners).toBe(false)
  })

  test('computeCornerRadiusFromPointer supports single-corner Alt modifier', () => {
    const node = createRectangle({ x: 0, y: 0, width: 200, height: 100, cornerRadius: 0 })
    const editor = mockEditor(node)

    // Dragging TR with Alt held: pointer at (185, 15) -> width - lx = 15, ly = 15 -> radius = 15
    const result = computeCornerRadiusFromPointer(node, 'tr', 185, 15, editor, false, true)
    expect(result.radius).toBe(15)
    expect(result.updates.independentCorners).toBe(true)
    expect(result.updates.topRightRadius).toBe(15)
    expect(result.updates.topLeftRadius).toBeUndefined()
  })

  test('computeCornerRadiusFromPointer clamps to max half dimension', () => {
    const node = createRectangle({ x: 0, y: 0, width: 200, height: 80, cornerRadius: 0 })
    const editor = mockEditor(node)

    // Dragging deep into center: max radius is 80 / 2 = 40
    const result = computeCornerRadiusFromPointer(node, 'tl', 70, 70, editor, false, false)
    expect(result.radius).toBe(40)
  })

  test('computeCornerRadiusFromPointer snaps to multiples of 8 with Shift held', () => {
    const node = createRectangle({ x: 0, y: 0, width: 200, height: 100, cornerRadius: 0 })
    const editor = mockEditor(node)

    // Dragging TL: (19, 19) -> 19 -> snapped with Shift to 16 (round(19/8)*8 = 16)
    const result = computeCornerRadiusFromPointer(node, 'tl', 19, 19, editor, true, false)
    expect(result.radius).toBe(16)
  })
})
