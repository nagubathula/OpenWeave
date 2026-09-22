import { beforeAll, describe, expect, setDefaultTimeout, test } from 'bun:test'

import { exportFigFile, initCodec, parseFigFile, SceneGraph } from '@openweave/core'
import type { NodeAnimationTrack } from '@openweave/scene-graph'

import { collectAllNodes } from '#tests/helpers/fig-traversal'

setDefaultTimeout(60_000)

describe('roundtrip: motionTracks survives export → re-import', () => {
  beforeAll(async () => {
    await initCodec()
  })

  test('motionTracks on top-level frames and child nodes survive .fig round-trip', async () => {
    const graph = new SceneGraph()
    const page = graph.getPages()[0]

    const frameMotion: NodeAnimationTrack = {
      nodeId: '',
      nodeName: 'Animated Frame',
      tracks: {
        opacity: {
          property: 'opacity',
          keyframes: [
            { id: 'kf-1', timeMs: 0, value: 0, easing: 'ease-out' },
            { id: 'kf-2', timeMs: 500, value: 1, easing: 'ease-out' }
          ]
        },
        y: {
          property: 'y',
          keyframes: [
            { id: 'kf-3', timeMs: 0, value: 100, easing: 'spring' },
            { id: 'kf-4', timeMs: 600, value: 0, easing: 'spring' }
          ]
        }
      }
    }

    const frame = graph.createNode('FRAME', page.id, {
      name: 'Animated Frame',
      x: 0,
      y: 0,
      width: 400,
      height: 300,
      motionTracks: frameMotion
    })

    const childMotion: NodeAnimationTrack = {
      nodeId: '',
      nodeName: 'Heart Icon',
      tracks: {
        scale: {
          property: 'scale',
          keyframes: [
            { id: 'kf-5', timeMs: 200, value: 0.8, easing: 'spring' },
            { id: 'kf-6', timeMs: 400, value: 1.2, easing: 'spring' },
            { id: 'kf-7', timeMs: 600, value: 1, easing: 'spring' }
          ]
        }
      }
    }

    graph.createNode('RECTANGLE', frame.id, {
      name: 'Heart Icon',
      x: 50,
      y: 50,
      width: 100,
      height: 100,
      motionTracks: childMotion
    })

    const bytes = await exportFigFile(graph)
    const reImported = await parseFigFile(bytes)
    const nodes = collectAllNodes(reImported)

    const reFrame = nodes.find((n) => n.name === 'Animated Frame')
    expect(reFrame).toBeDefined()
    expect(reFrame?.motionTracks).toBeDefined()
    expect(reFrame?.motionTracks?.nodeName).toBe('Animated Frame')
    expect(reFrame?.motionTracks?.tracks?.opacity?.keyframes).toHaveLength(2)
    expect(reFrame?.motionTracks?.tracks?.opacity?.keyframes[0].value).toBe(0)
    expect(reFrame?.motionTracks?.tracks?.opacity?.keyframes[1].value).toBe(1)
    expect(reFrame?.motionTracks?.tracks?.y?.keyframes).toHaveLength(2)

    const reChild = nodes.find((n) => n.name === 'Heart Icon')
    expect(reChild).toBeDefined()
    expect(reChild?.motionTracks).toBeDefined()
    expect(reChild?.motionTracks?.nodeName).toBe('Heart Icon')
    expect(reChild?.motionTracks?.tracks?.scale?.keyframes).toHaveLength(3)
    expect(reChild?.motionTracks?.tracks?.scale?.keyframes[1].value).toBe(1.2)
  })
})
