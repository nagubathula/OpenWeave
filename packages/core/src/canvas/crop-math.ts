import type { GradientTransform, ImageScaleMode } from '@openweave/scene-graph'
import type { Vector } from '@openweave/scene-graph/primitives'

export type CropHandle = 'tl' | 'tr' | 'br' | 'bl' | 't' | 'r' | 'b' | 'l'

export interface CropCorners {
  tl: Vector
  tr: Vector
  br: Vector
  bl: Vector
}

export const IDENTITY_TRANSFORM: GradientTransform = {
  m00: 1,
  m01: 0,
  m02: 0,
  m10: 0,
  m11: 1,
  m12: 0
}

/** Inverts a 2x3 affine matrix. Returns null if degenerate. */
export function invertMatrix2x3(m: GradientTransform): GradientTransform | null {
  const det = m.m00 * m.m11 - m.m01 * m.m10
  if (Math.abs(det) < 1e-9) return null
  const invDet = 1 / det
  return {
    m00: m.m11 * invDet,
    m01: -m.m01 * invDet,
    m02: (m.m01 * m.m12 - m.m11 * m.m02) * invDet,
    m10: -m.m10 * invDet,
    m11: m.m00 * invDet,
    m12: (m.m10 * m.m02 - m.m00 * m.m12) * invDet
  }
}

/** Multiplies two 2x3 affine matrices. */
export function multiplyMatrix2x3(a: GradientTransform, b: GradientTransform): GradientTransform {
  return {
    m00: a.m00 * b.m00 + a.m01 * b.m10,
    m01: a.m00 * b.m01 + a.m01 * b.m11,
    m02: a.m00 * b.m02 + a.m01 * b.m12 + a.m02,
    m10: a.m10 * b.m00 + a.m11 * b.m10,
    m11: a.m10 * b.m01 + a.m11 * b.m11,
    m12: a.m10 * b.m02 + a.m11 * b.m12 + a.m12
  }
}

/** Applies a 2x3 affine matrix to a 2D point. */
export function applyMatrix2x3(m: GradientTransform, x: number, y: number): Vector {
  return {
    x: m.m00 * x + m.m01 * y + m.m02,
    y: m.m10 * x + m.m11 * y + m.m12
  }
}

/**
 * Computes default normalized imageTransform for a node and image dimensions
 * matching Figma's convention (mapping normalized node UV to normalized image UV).
 */
export function defaultCropTransform(
  nodeWidth: number,
  nodeHeight: number,
  imgWidth: number,
  imgHeight: number,
  mode: ImageScaleMode = 'CROP'
): GradientTransform {
  if (imgWidth <= 0 || imgHeight <= 0 || nodeWidth <= 0 || nodeHeight <= 0) {
    return { ...IDENTITY_TRANSFORM }
  }

  if (mode === 'TILE') {
    return {
      m00: nodeWidth / imgWidth,
      m01: 0,
      m02: 0,
      m10: 0,
      m11: nodeHeight / imgHeight,
      m12: 0
    }
  }

  const scale =
    mode === 'FIT'
      ? Math.min(nodeWidth / imgWidth, nodeHeight / imgHeight)
      : Math.max(nodeWidth / imgWidth, nodeHeight / imgHeight)

  const m00 = nodeWidth / (scale * imgWidth)
  const m11 = nodeHeight / (scale * imgHeight)
  const m02 = 0.5 * (1 - m00)
  const m12 = 0.5 * (1 - m11)

  return { m00, m01: 0, m02, m10: 0, m11, m12 }
}

/**
 * Computes the 4 corners of the uncropped image in node-local pixel space.
 */
export function computeImageCornersInNode(
  m: GradientTransform,
  nodeWidth: number,
  nodeHeight: number
): CropCorners {
  const inv = invertMatrix2x3(m) ?? IDENTITY_TRANSFORM

  const mapUV = (u: number, v: number): Vector => {
    const un = inv.m00 * u + inv.m01 * v + inv.m02
    const vn = inv.m10 * u + inv.m11 * v + inv.m12
    return {
      x: un * nodeWidth,
      y: vn * nodeHeight
    }
  }

  return {
    tl: mapUV(0, 0),
    tr: mapUV(1, 0),
    br: mapUV(1, 1),
    bl: mapUV(0, 1)
  }
}

/**
 * Translates the image within the container by (deltaX, deltaY) in node-local pixels.
 */
export function updateCropPan(
  origTransform: GradientTransform,
  deltaX: number,
  deltaY: number,
  nodeWidth: number,
  nodeHeight: number
): GradientTransform {
  if (nodeWidth <= 0 || nodeHeight <= 0) return origTransform
  const du = deltaX / nodeWidth
  const dv = deltaY / nodeHeight
  return {
    ...origTransform,
    m02: origTransform.m02 - (origTransform.m00 * du + origTransform.m01 * dv),
    m12: origTransform.m12 - (origTransform.m10 * du + origTransform.m11 * dv)
  }
}

interface AnchorInfo {
  anchorPos: Vector
  handlePos: Vector
  isCorner: boolean
  axis?: 'x' | 'y'
}

function resolveCropHandleAnchor(handle: CropHandle, corners: CropCorners): AnchorInfo {
  const midTop: Vector = {
    x: (corners.tl.x + corners.tr.x) / 2,
    y: (corners.tl.y + corners.tr.y) / 2
  }
  const midBottom: Vector = {
    x: (corners.bl.x + corners.br.x) / 2,
    y: (corners.bl.y + corners.br.y) / 2
  }
  const midLeft: Vector = {
    x: (corners.tl.x + corners.bl.x) / 2,
    y: (corners.tl.y + corners.bl.y) / 2
  }
  const midRight: Vector = {
    x: (corners.tr.x + corners.br.x) / 2,
    y: (corners.tr.y + corners.br.y) / 2
  }

  switch (handle) {
    case 'tl':
      return { anchorPos: corners.br, handlePos: corners.tl, isCorner: true }
    case 'tr':
      return { anchorPos: corners.bl, handlePos: corners.tr, isCorner: true }
    case 'br':
      return { anchorPos: corners.tl, handlePos: corners.br, isCorner: true }
    case 'bl':
      return { anchorPos: corners.tr, handlePos: corners.bl, isCorner: true }
    case 't':
      return { anchorPos: midBottom, handlePos: midTop, isCorner: false, axis: 'y' }
    case 'b':
      return { anchorPos: midTop, handlePos: midBottom, isCorner: false, axis: 'y' }
    case 'l':
      return { anchorPos: midRight, handlePos: midLeft, isCorner: false, axis: 'x' }
    case 'r':
      return { anchorPos: midLeft, handlePos: midRight, isCorner: false, axis: 'x' }
  }
}

/**
 * Scales/zooms the image around the opposite anchor when dragging a handle.
 */
export function updateCropScale(
  origTransform: GradientTransform,
  handle: CropHandle,
  currentPos: Vector,
  nodeWidth: number,
  nodeHeight: number
): GradientTransform {
  if (nodeWidth <= 0 || nodeHeight <= 0) return origTransform

  const corners = computeImageCornersInNode(origTransform, nodeWidth, nodeHeight)
  const { anchorPos, handlePos, isCorner, axis } = resolveCropHandleAnchor(handle, corners)

  const origVec = { x: handlePos.x - anchorPos.x, y: handlePos.y - anchorPos.y }
  const curVec = { x: currentPos.x - anchorPos.x, y: currentPos.y - anchorPos.y }

  const uNode = anchorPos.x / nodeWidth
  const vNode = anchorPos.y / nodeHeight
  const ua = origTransform.m00 * uNode + origTransform.m01 * vNode + origTransform.m02
  const va = origTransform.m10 * uNode + origTransform.m11 * vNode + origTransform.m12

  if (isCorner) {
    const lenOrigSq = origVec.x * origVec.x + origVec.y * origVec.y
    if (lenOrigSq < 1e-4) return origTransform
    const dot = curVec.x * origVec.x + curVec.y * origVec.y
    const s = Math.max(0.05, dot / lenOrigSq)
    const k = 1 / s

    return {
      m00: origTransform.m00 * k,
      m01: origTransform.m01 * k,
      m02: origTransform.m02 * k + ua * (1 - k),
      m10: origTransform.m10 * k,
      m11: origTransform.m11 * k,
      m12: origTransform.m12 * k + va * (1 - k)
    }
  }

  if (axis === 'x') {
    const lenOrig = Math.abs(origVec.x)
    if (lenOrig < 1e-4) return origTransform
    const s = Math.max(0.05, (curVec.x * Math.sign(origVec.x)) / lenOrig)
    const kx = 1 / s

    return {
      m00: origTransform.m00 * kx,
      m01: origTransform.m01 * kx,
      m02: origTransform.m02 * kx + ua * (1 - kx),
      m10: origTransform.m10,
      m11: origTransform.m11,
      m12: origTransform.m12
    }
  }

  const lenOrig = Math.abs(origVec.y)
  if (lenOrig < 1e-4) return origTransform
  const s = Math.max(0.05, (curVec.y * Math.sign(origVec.y)) / lenOrig)
  const ky = 1 / s

  return {
    m00: origTransform.m00,
    m01: origTransform.m01,
    m02: origTransform.m02,
    m10: origTransform.m10 * ky,
    m11: origTransform.m11 * ky,
    m12: origTransform.m12 * ky + va * (1 - ky)
  }
}

/**
 * Rotates the image by angle (in radians) around its visual center.
 */
export function updateCropRotate(
  origTransform: GradientTransform,
  angleRad: number,
  nodeWidth: number,
  nodeHeight: number
): GradientTransform {
  if (nodeWidth <= 0 || nodeHeight <= 0) return origTransform
  const corners = computeImageCornersInNode(origTransform, nodeWidth, nodeHeight)
  const cx = (corners.tl.x + corners.br.x) / 2
  const cy = (corners.tl.y + corners.br.y) / 2

  const uNode = cx / nodeWidth
  const vNode = cy / nodeHeight
  const uc = origTransform.m00 * uNode + origTransform.m01 * vNode + origTransform.m02
  const vc = origTransform.m10 * uNode + origTransform.m11 * vNode + origTransform.m12

  const cos = Math.cos(-angleRad)
  const sin = Math.sin(-angleRad)

  // R(-theta) applied in UV space centered at (uc, vc)
  const rotM: GradientTransform = {
    m00: cos,
    m01: -sin,
    m02: uc * (1 - cos) + vc * sin,
    m10: sin,
    m11: cos,
    m12: vc * (1 - cos) - uc * sin
  }

  return multiplyMatrix2x3(rotM, origTransform)
}

/** Point in polygon test for convex quadrilateral (tl, tr, br, bl). */
export function pointInQuad(p: Vector, corners: CropCorners): boolean {
  const { tl, tr, br, bl } = corners
  const cross = (a: Vector, b: Vector, pt: Vector) =>
    (b.x - a.x) * (pt.y - a.y) - (b.y - a.y) * (pt.x - a.x)

  const c1 = cross(tl, tr, p)
  const c2 = cross(tr, br, p)
  const c3 = cross(br, bl, p)
  const c4 = cross(bl, tl, p)

  const hasNeg = c1 < 0 || c2 < 0 || c3 < 0 || c4 < 0
  const hasPos = c1 > 0 || c2 > 0 || c3 > 0 || c4 > 0
  return !(hasNeg && hasPos)
}

export type HitTestCropResult =
  | { type: 'handle'; handle: CropHandle }
  | { type: 'rotate'; corner: 'tl' | 'tr' | 'br' | 'bl' }
  | { type: 'inside' }
  | null

/**
 * Hit tests a point in node-local pixels against crop handles, rotation zone, or image interior.
 */
export function hitTestCrop(
  point: Vector,
  corners: CropCorners,
  handleRadius: number = 8
): HitTestCropResult {
  const handles: Array<{ key: CropHandle; pos: Vector; isCorner: boolean }> = [
    { key: 'tl', pos: corners.tl, isCorner: true },
    { key: 'tr', pos: corners.tr, isCorner: true },
    { key: 'br', pos: corners.br, isCorner: true },
    { key: 'bl', pos: corners.bl, isCorner: true },
    {
      key: 't',
      pos: { x: (corners.tl.x + corners.tr.x) / 2, y: (corners.tl.y + corners.tr.y) / 2 },
      isCorner: false
    },
    {
      key: 'r',
      pos: { x: (corners.tr.x + corners.br.x) / 2, y: (corners.tr.y + corners.br.y) / 2 },
      isCorner: false
    },
    {
      key: 'b',
      pos: { x: (corners.bl.x + corners.br.x) / 2, y: (corners.bl.y + corners.br.y) / 2 },
      isCorner: false
    },
    {
      key: 'l',
      pos: { x: (corners.tl.x + corners.bl.x) / 2, y: (corners.tl.y + corners.bl.y) / 2 },
      isCorner: false
    }
  ]

  // Check direct handle hits
  for (const h of handles) {
    const dx = point.x - h.pos.x
    const dy = point.y - h.pos.y
    if (dx * dx + dy * dy <= handleRadius * handleRadius) {
      return { type: 'handle', handle: h.key }
    }
  }

  // Check rotation zones (just outside corners)
  const rotateRadius = handleRadius * 2.5
  for (const h of handles) {
    if (!h.isCorner) continue
    const dx = point.x - h.pos.x
    const dy = point.y - h.pos.y
    const distSq = dx * dx + dy * dy
    if (distSq <= rotateRadius * rotateRadius) {
      return { type: 'rotate', corner: h.key as 'tl' | 'tr' | 'br' | 'bl' }
    }
  }

  // Check if inside image bounds
  if (pointInQuad(point, corners)) {
    return { type: 'inside' }
  }

  return null
}
