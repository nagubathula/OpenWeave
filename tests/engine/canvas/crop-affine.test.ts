import { describe, expect, it } from 'bun:test'

import {
  applyMatrix2x3,
  computeImageCornersInNode,
  defaultCropTransform,
  hitTestCrop,
  invertMatrix2x3,
  multiplyMatrix2x3,
  pointInQuad,
  updateCropPan,
  updateCropRotate,
  updateCropScale
} from '@openweave/core/canvas'
import { createEditor } from '@openweave/core/editor'

describe('crop-math affine transforms', () => {
  it('inverts and multiplies 2x3 matrices correctly', () => {
    const m = { m00: 2, m01: 0.5, m02: 10, m10: -0.2, m11: 1.5, m12: 25 }
    const inv = invertMatrix2x3(m)
    expect(inv).not.toBeNull()
    if (!inv) return

    const product = multiplyMatrix2x3(m, inv)
    expect(product.m00).toBeCloseTo(1, 5)
    expect(product.m01).toBeCloseTo(0, 5)
    expect(product.m02).toBeCloseTo(0, 5)
    expect(product.m10).toBeCloseTo(0, 5)
    expect(product.m11).toBeCloseTo(1, 5)
    expect(product.m12).toBeCloseTo(0, 5)
  })

  it('computes default crop transform for FILL mode matching aspect ratios', () => {
    // Square node (100x100), wider image (200x100) -> image width is cropped
    const tWide = defaultCropTransform(100, 100, 200, 100, 'FILL')
    expect(tWide.m11).toBeCloseTo(1, 5)
    expect(tWide.m00).toBeCloseTo(0.5, 5)
    expect(tWide.m02).toBeCloseTo(0.25, 5)
    expect(tWide.m12).toBeCloseTo(0, 5)

    // Square node (100x100), taller image (100x200) -> image height is cropped
    const tTall = defaultCropTransform(100, 100, 100, 200, 'FILL')
    expect(tTall.m00).toBeCloseTo(1, 5)
    expect(tTall.m11).toBeCloseTo(0.5, 5)
    expect(tTall.m02).toBeCloseTo(0, 5)
    expect(tTall.m12).toBeCloseTo(0.25, 5)
  })

  it('computes uncropped corners in node coordinates', () => {
    // Square node (100x100), wider image (200x100)
    const t = defaultCropTransform(100, 100, 200, 100, 'FILL')
    const corners = computeImageCornersInNode(t, 100, 100)

    // In FILL mode, width is 200 centered in 100: x from -50 to 150
    expect(corners.tl.x).toBeCloseTo(-50, 4)
    expect(corners.tl.y).toBeCloseTo(0, 4)
    expect(corners.tr.x).toBeCloseTo(150, 4)
    expect(corners.tr.y).toBeCloseTo(0, 4)
    expect(corners.br.x).toBeCloseTo(150, 4)
    expect(corners.br.y).toBeCloseTo(100, 4)
    expect(corners.bl.x).toBeCloseTo(-50, 4)
    expect(corners.bl.y).toBeCloseTo(100, 4)
  })

  it('updates crop pan smoothly', () => {
    const orig = defaultCropTransform(100, 100, 200, 100, 'FILL')
    // Pan right by 20px
    const panned = updateCropPan(orig, 20, 0, 100, 100)
    const corners = computeImageCornersInNode(panned, 100, 100)

    expect(corners.tl.x).toBeCloseTo(-30, 4)
    expect(corners.tr.x).toBeCloseTo(170, 4)
  })

  it('scales image around opposite anchor on corner handle drag', () => {
    const orig = defaultCropTransform(100, 100, 100, 100, 'FILL')
    const corners = computeImageCornersInNode(orig, 100, 100)
    expect(corners.tl).toEqual({ x: 0, y: 0 })
    expect(corners.br).toEqual({ x: 100, y: 100 })

    // Drag bottom-right corner from (100, 100) to (150, 150) -> anchor is top-left (0, 0)
    const scaled = updateCropScale(orig, 'br', { x: 150, y: 150 }, 100, 100)
    const newCorners = computeImageCornersInNode(scaled, 100, 100)

    // Anchor (0, 0) should not move
    expect(newCorners.tl.x).toBeCloseTo(0, 3)
    expect(newCorners.tl.y).toBeCloseTo(0, 3)
    // New bottom-right should be near 150, 150
    expect(newCorners.br.x).toBeCloseTo(150, 3)
    expect(newCorners.br.y).toBeCloseTo(150, 3)
  })

  it('rotates image around center', () => {
    const orig = defaultCropTransform(100, 100, 100, 100, 'FILL')
    const rotated = updateCropRotate(orig, Math.PI / 2, 100, 100)
    const corners = computeImageCornersInNode(rotated, 100, 100)

    // Center is (50, 50). Rotated 90 deg clockwise:
    // Original TL (0, 0) relative to center (-50, -50) rotates to (50, -50) -> (100, 0)
    expect(corners.tl.x).toBeCloseTo(100, 3)
    expect(corners.tl.y).toBeCloseTo(0, 3)
  })

  it('hit tests handles, rotate zone, and image interior', () => {
    const corners = {
      tl: { x: 0, y: 0 },
      tr: { x: 100, y: 0 },
      br: { x: 100, y: 100 },
      bl: { x: 0, y: 100 }
    }

    // Direct handle hit
    const hitTL = hitTestCrop({ x: 2, y: 2 }, corners, 8)
    expect(hitTL).toEqual({ type: 'handle', handle: 'tl' })

    // Midpoint handle hit
    const hitTop = hitTestCrop({ x: 50, y: 1 }, corners, 8)
    expect(hitTop).toEqual({ type: 'handle', handle: 't' })

    // Rotate hit (just outside corner)
    const hitRotate = hitTestCrop({ x: -12, y: -12 }, corners, 8)
    expect(hitRotate).toEqual({ type: 'rotate', corner: 'tl' })

    // Inside image hit
    const hitInside = hitTestCrop({ x: 50, y: 50 }, corners, 8)
    expect(hitInside).toEqual({ type: 'inside' })

    // Completely outside
    const hitNone = hitTestCrop({ x: 500, y: 500 }, corners, 8)
    expect(hitNone).toBeNull()
  })

  it('manages crop mode lifecycle and transforms in editor', () => {
    const editor = createEditor()
    const nodeId = editor.createShape('RECTANGLE', 0, 0, 200, 100)

    // Add an image fill to the rectangle
    editor.updateNode(nodeId, {
      fills: [
        {
          type: 'IMAGE',
          color: { r: 1, g: 1, b: 1, a: 1 },
          opacity: 1,
          visible: true,
          imageScaleMode: 'FILL'
        }
      ]
    })

    // Enter crop mode
    editor.enterCropMode(nodeId)
    expect(editor.state.activeTool).toBe('CROP')
    expect(editor.state.cropState).not.toBeNull()
    expect(editor.state.cropState?.nodeId).toBe(nodeId)

    const nodeAfterEnter = editor.graph.getNode(nodeId)
    expect(nodeAfterEnter?.fills?.[0]?.imageScaleMode).toBe('CROP')
    expect(nodeAfterEnter?.fills?.[0]?.imageTransform).toBeDefined()

    // Adjust crop transform
    const newTransform = { m00: 0.8, m01: 0, m02: 0.1, m10: 0, m11: 0.8, m12: 0.1 }
    editor.setCropTransform(newTransform)
    const nodeAfterTransform = editor.graph.getNode(nodeId)
    expect(nodeAfterTransform?.fills?.[0]?.imageTransform).toEqual(newTransform)

    // Adjust tile scale
    editor.setTileScale(1.5)
    const nodeAfterScale = editor.graph.getNode(nodeId)
    expect(nodeAfterScale?.fills?.[0]?.scale).toBe(1.5)

    // Reset crop
    editor.resetCrop()
    const nodeAfterReset = editor.graph.getNode(nodeId)
    expect(nodeAfterReset?.fills?.[0]?.imageTransform?.m00).toBeCloseTo(1, 4)

    // Exit crop mode
    editor.exitCropMode(true)
    expect(editor.state.activeTool).toBe('SELECT')
    expect(editor.state.cropState).toBeNull()
  })
})
