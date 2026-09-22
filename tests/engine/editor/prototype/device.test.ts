import { beforeAll, describe, expect, test } from 'bun:test'

import {
  computeDeviceOuterBounds,
  DEVICE_SPECS,
  exportFigFile,
  initCodec,
  parseFigFile,
  resolveDeviceSpec,
  SceneGraph
} from '@openweave/core'
import type { PrototypeDevice } from '@openweave/scene-graph'

describe('prototype device mockups & hardware frames', () => {
  beforeAll(async () => {
    await initCodec()
  })

  test('resolves device spec from preset identifier', () => {
    const device: PrototypeDevice = {
      type: 'PRESET',
      presetIdentifier: 'iphone-16-pro'
    }
    const spec = resolveDeviceSpec(device)
    expect(spec).not.toBeNull()
    expect(spec?.id).toBe('iphone-16-pro')
    expect(spec?.name).toBe('iPhone 16 & 15 Pro')
    expect(spec?.width).toBe(393)
    expect(spec?.height).toBe(852)
    expect(spec?.cutout.type).toBe('dynamic-island')
    expect(spec?.hasHomeIndicator).toBe(true)
  })

  test('resolves none when device type is NONE', () => {
    const device: PrototypeDevice = { type: 'NONE' }
    const spec = resolveDeviceSpec(device)
    expect(spec).toBeNull()
  })

  test('auto-detects iPhone 16 Pro from matching frame dimensions', () => {
    const graph = new SceneGraph()
    const page = graph.getPages()[0]
    const frame = graph.createNode('FRAME', page.id, {
      name: 'Mobile Screen',
      x: 0,
      y: 0,
      width: 393,
      height: 852
    })

    const spec = resolveDeviceSpec(null, frame)
    expect(spec).not.toBeNull()
    expect(spec?.id).toBe('iphone-16-pro')
  })

  test('auto-detects Google Pixel 9 from matching frame dimensions', () => {
    const graph = new SceneGraph()
    const page = graph.getPages()[0]
    const frame = graph.createNode('FRAME', page.id, {
      name: 'Android Screen',
      x: 0,
      y: 0,
      width: 402,
      height: 874
    })

    const spec = resolveDeviceSpec(null, frame)
    expect(spec).not.toBeNull()
    expect(spec?.id).toBe('google-pixel-9')
    expect(spec?.cutout.type).toBe('punch-hole')
  })

  test('computes outer device bounds with bezels in portrait and landscape', () => {
    const spec = DEVICE_SPECS['iphone-16-pro']
    const portraitBounds = computeDeviceOuterBounds(spec, 393, 852, 'NONE')
    expect(portraitBounds.totalWidth).toBe(393 + 12 + 12)
    expect(portraitBounds.totalHeight).toBe(852 + 12 + 12)

    const landscapeBounds = computeDeviceOuterBounds(spec, 852, 393, 'CCW_90')
    expect(landscapeBounds.totalWidth).toBe(852 + 12 + 12)
    expect(landscapeBounds.totalHeight).toBe(393 + 12 + 12)
  })

  test('.fig export and import round-trip preserves page prototypeDevice', async () => {
    const graph = new SceneGraph()
    const page = graph.getPages()[0]

    page.prototypeDevice = {
      type: 'PRESET',
      presetIdentifier: 'iphone-16-pro',
      rotation: 'CCW_90',
      color: 'TITANIUM',
      size: { x: 393, y: 852 }
    }

    const bytes = await exportFigFile(graph)
    const reImported = await parseFigFile(bytes.slice().buffer)

    const reImportedPage = reImported.getPages()[0]
    expect(reImportedPage.prototypeDevice).toBeDefined()
    expect(reImportedPage.prototypeDevice?.type).toBe('PRESET')
    expect(reImportedPage.prototypeDevice?.presetIdentifier).toBe('iphone-16-pro')
    expect(reImportedPage.prototypeDevice?.rotation).toBe('CCW_90')
  })
})
