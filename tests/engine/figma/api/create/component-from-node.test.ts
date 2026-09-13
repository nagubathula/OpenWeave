import { describe, expect, test } from 'bun:test'

import { createAPI } from '../helpers'

describe('createComponentFromNode', () => {
  test('converts frame to component', () => {
    const api = createAPI()
    const frame = api.createFrame()
    frame.name = 'MyButton'
    frame.resize(200, 50)
    const child = api.createRectangle()
    child.name = 'Background'
    frame.appendChild(child)
    const frameId = frame.id

    const comp = api.createComponentFromNode(frame)
    expect(comp.type).toBe('COMPONENT')
    expect(comp.name).toBe('MyButton')
    expect(comp.width).toBe(200)
    expect(comp.height).toBe(50)
    expect(comp.children.length).toBe(1)
    expect(comp.children[0].name).toBe('Background')
    expect(api.getNodeById(frameId)).toBeNull()
  })

  test('preserves motionTracks when converting animated frame to component', () => {
    const api = createAPI()
    const frame = api.createFrame()
    frame.name = 'AnimatedCard'
    frame.setPluginData('test', '1')

    // Set motion tracks on frame
    const graphNode = api.graph.getNode(frame.id)
    if (graphNode) {
      graphNode.motionTracks = {
        nodeId: frame.id,
        nodeName: 'AnimatedCard',
        tracks: {
          scaleX: {
            property: 'scaleX',
            keyframes: [
              { id: '1', timeMs: 0, value: 1 },
              { id: '2', timeMs: 500, value: 1.2 }
            ]
          }
        }
      }
    }

    const comp = api.createComponentFromNode(frame)
    expect(comp.type).toBe('COMPONENT')
    const compGraphNode = api.graph.getNode(comp.id)
    expect(compGraphNode?.motionTracks).toBeDefined()
    expect(compGraphNode?.motionTracks?.tracks.scaleX?.keyframes.length).toBe(2)
  })
})
