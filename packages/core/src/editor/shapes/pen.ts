import type { SceneNode, VectorNetwork, VectorRegion, VectorSegment } from '@openweave/scene-graph'
import type { Vector } from '@openweave/scene-graph/primitives'

import { BLACK } from '#core/constants'
import type { EditorContext } from '#core/editor/types'
import { computeAccurateBounds } from '#core/vector'

export interface PenDragOptions {
  keepOpposite?: boolean
  constrainToOpposite?: boolean
  oppositeTangent?: Vector | null
}

type CreateShape = (
  type: 'VECTOR',
  x: number,
  y: number,
  w: number,
  h: number,
  parentId?: string
) => string

const PEN_DEFAULT_STROKE: SceneNode['strokes'][number] = {
  color: BLACK,
  weight: 2,
  opacity: 1,
  visible: true,
  align: 'CENTER'
}

function projectTangentToAxis(active: Vector, opposite: Vector): Vector {
  const axis = { x: -opposite.x, y: -opposite.y }
  const axisLen = Math.hypot(axis.x, axis.y)
  if (axisLen <= 1e-6) return active
  const dir = { x: axis.x / axisLen, y: axis.y / axisLen }
  const len = Math.max(0, active.x * dir.x + active.y * dir.y)
  return { x: dir.x * len, y: dir.y * len }
}

function applyAnchorTangent(
  tangent: Vector,
  isClosing: boolean,
  firstSeg: VectorSegment | undefined,
  lastSeg: VectorSegment | undefined
): void {
  if (isClosing) {
    if (!firstSeg) return
    if (firstSeg.start === 0) firstSeg.tangentStart = { x: tangent.x, y: tangent.y }
    else if (firstSeg.end === 0) firstSeg.tangentEnd = { x: tangent.x, y: tangent.y }
    return
  }
  if (lastSeg) {
    lastSeg.tangentEnd = { x: tangent.x, y: tangent.y }
  }
}

type PenState = NonNullable<EditorContext['state']['penState']>

interface VertexTangents {
  incoming: Vector
  outgoing: Vector
}

function solveCircumcircle(
  origin: Vector,
  p1: Vector,
  p2: Vector
): { ox: number; oy: number; r: number } | null {
  const v1 = { x: p1.x - origin.x, y: p1.y - origin.y }
  const v2 = { x: p2.x - origin.x, y: p2.y - origin.y }
  const d1 = Math.hypot(v1.x, v1.y)
  const d2 = Math.hypot(v2.x, v2.y)
  if (d1 < 1e-6 || d2 < 1e-6) return null

  const cross = v1.x * v2.y - v1.y * v2.x
  if (Math.abs(cross) < 1e-4 * d1 * d2) return null

  const d = 2 * cross
  const ox = (d1 * d1 * v2.y - d2 * d2 * v1.y) / d
  const oy = (d2 * d2 * v1.x - d1 * d1 * v2.x) / d
  return { ox, oy, r: Math.hypot(ox, oy) }
}

function circularArcHandleLength(chordDist: number, radius: number): number {
  const s = Math.min(1, chordDist / (2 * radius))
  const theta = 2 * Math.asin(s)
  return Math.max(
    chordDist / 4,
    Math.min(0.5523 * chordDist, (4 / 3) * Math.tan(theta / 4) * radius)
  )
}

function circumcircleTangents(
  origin: Vector,
  neighbor: Vector,
  other: Vector,
  direction: Vector
): { unit: Vector; radius: number } | null {
  const circle = solveCircumcircle(origin, neighbor, other)
  if (!circle) return null
  let tx = -circle.oy / circle.r
  let ty = circle.ox / circle.r
  if (tx * direction.x + ty * direction.y < 0) {
    tx = -tx
    ty = -ty
  }
  return { unit: { x: tx, y: ty }, radius: circle.r }
}

function solveArcTangents(a: Vector, b: Vector, c: Vector): VertexTangents {
  const d1 = Math.hypot(a.x - b.x, a.y - b.y)
  const d2 = Math.hypot(c.x - b.x, c.y - b.y)
  if (d1 < 1e-6 || d2 < 1e-6) {
    return { incoming: { x: 0, y: 0 }, outgoing: { x: 0, y: 0 } }
  }

  const dir = { x: c.x - a.x, y: c.y - a.y }
  const dirLen = Math.hypot(dir.x, dir.y)
  if (dirLen < 1e-6) {
    return { incoming: { x: 0, y: 0 }, outgoing: { x: 0, y: 0 } }
  }

  const fit = circumcircleTangents(b, a, c, dir)
  if (!fit) {
    const unitT = { x: dir.x / dirLen, y: dir.y / dirLen }
    return {
      incoming: { x: -unitT.x * (d1 / 3), y: -unitT.y * (d1 / 3) },
      outgoing: { x: unitT.x * (d2 / 3), y: unitT.y * (d2 / 3) }
    }
  }

  const l1 = circularArcHandleLength(d1, fit.radius)
  const l2 = circularArcHandleLength(d2, fit.radius)

  return {
    incoming: { x: -fit.unit.x * l1, y: -fit.unit.y * l1 },
    outgoing: { x: fit.unit.x * l2, y: fit.unit.y * l2 }
  }
}

function solveEndpointArcTangent(anchor: Vector, neighbor: Vector, far: Vector): Vector {
  const v = { x: neighbor.x - anchor.x, y: neighbor.y - anchor.y }
  const d = Math.hypot(v.x, v.y)
  if (d < 1e-6) return { x: 0, y: 0 }

  const fit = circumcircleTangents(anchor, neighbor, far, v)
  if (!fit) {
    return { x: v.x / 3, y: v.y / 3 }
  }

  const l = circularArcHandleLength(d, fit.radius)
  return { x: fit.unit.x * l, y: fit.unit.y * l }
}

function computeCurvatureTangents(
  vertices: PenState['vertices'],
  closed: boolean
): VertexTangents[] {
  const n = vertices.length
  if (n < 2) return []

  const tangents: VertexTangents[] = []
  if (n === 2 && !closed) {
    tangents.push(
      { incoming: { x: 0, y: 0 }, outgoing: { x: 0, y: 0 } },
      { incoming: { x: 0, y: 0 }, outgoing: { x: 0, y: 0 } }
    )
  } else if (closed) {
    for (let i = 0; i < n; i++) {
      const prev = vertices[(i - 1 + n) % n]
      const curr = vertices[i]
      const next = vertices[(i + 1) % n]
      tangents.push(solveArcTangents(prev, curr, next))
    }
  } else {
    for (let i = 0; i < n; i++) {
      if (i === 0) {
        tangents.push({
          incoming: { x: 0, y: 0 },
          outgoing: solveEndpointArcTangent(vertices[0], vertices[1], vertices[2])
        })
      } else if (i === n - 1) {
        tangents.push({
          incoming: solveEndpointArcTangent(vertices[n - 1], vertices[n - 2], vertices[n - 3]),
          outgoing: { x: 0, y: 0 }
        })
      } else {
        tangents.push(solveArcTangents(vertices[i - 1], vertices[i], vertices[i + 1]))
      }
    }
  }
  return tangents
}

/** Recompute every segment's tangents so the path curves smoothly through all vertices. */
function recomputeSmoothTangents(ps: PenState, closed: boolean): void {
  if (ps.vertices.length < 2) return
  const tangents = computeCurvatureTangents(ps.vertices, closed)
  for (const seg of ps.segments) {
    const ts = tangents[seg.start]
    const te = tangents[seg.end]
    if (ts) seg.tangentStart = { ...ts.outgoing }
    if (te) seg.tangentEnd = { ...te.incoming }
  }
  const last = ps.vertices.length - 1
  for (let i = 0; i < ps.vertices.length; i++) {
    if (closed || (i > 0 && i < last)) ps.vertices[i].handleMirroring = 'ANGLE_AND_LENGTH'
  }
}

export function createPenActions(ctx: EditorContext, createShape: CreateShape) {
  /**
   * Shared vertex commit for both pen modes: starts a path on the first click
   * (returning null), otherwise appends a vertex + segment and resets drag
   * state. The curvature flag picks the segment's start tangent source.
   */
  function appendPenVertex(x: number, y: number, curvature: boolean): PenState | null {
    if (!ctx.state.penState) {
      ctx.state.penState = {
        vertices: [{ x, y }],
        segments: [],
        dragTangent: null,
        oppositeDragTangent: null,
        pendingClose: false,
        closingToFirst: false,
        ...(curvature ? { curvature: true } : {})
      }
      return null
    }

    const ps = ctx.state.penState
    const prevIdx = ps.vertices.length - 1

    ps.vertices.push({ x, y })
    ps.segments.push({
      start: prevIdx,
      end: ps.vertices.length - 1,
      tangentStart: curvature ? { x: 0, y: 0 } : (ps.dragTangent ?? { x: 0, y: 0 }),
      tangentEnd: { x: 0, y: 0 }
    })
    ps.dragTangent = null
    ps.oppositeDragTangent = null
    ps.pendingClose = false
    ps.curvature = curvature
    return ps
  }

  function penAddVertex(x: number, y: number) {
    appendPenVertex(x, y, false)
    ctx.requestRender()
  }

  function penAddSmoothVertex(x: number, y: number) {
    const ps = appendPenVertex(x, y, true)
    if (ps) recomputeSmoothTangents(ps, false)
    ctx.requestRender()
  }

  /**
   * Curvature-pen hover preview: treat the cursor as the provisional next
   * vertex, so the last committed segment bends toward it and the rubber band
   * leaves the last vertex tangentially. `penAddSmoothVertex` recomputes from
   * scratch, so these speculative tangents never leak into a commit.
   */
  function penPreviewSmoothTangent(cx: number, cy: number) {
    const ps = ctx.state.penState
    if (!ps || !ps.curvature || ps.pendingClose || ps.vertices.length < 2) return
    const provisional = [...ps.vertices, { x: cx, y: cy }]
    const tangents = computeCurvatureTangents(provisional, false)
    const lastIdx = ps.vertices.length - 1
    const lastSeg = ps.segments[ps.segments.length - 1]
    const vertexTangent = tangents[lastIdx]
    if (lastSeg && vertexTangent) {
      lastSeg.tangentEnd = { ...vertexTangent.incoming }
    }
    ps.dragTangent = vertexTangent ? { ...vertexTangent.outgoing } : null
    ctx.requestRepaint()
  }

  function penSetDragTangent(tx: number, ty: number, options?: PenDragOptions) {
    if (!ctx.state.penState) return
    const ps = ctx.state.penState
    ps.curvature = false
    let active = { x: tx, y: ty }
    const isClosing = !!ps.pendingClose && ps.vertices.length > 2
    const anchorIndex = isClosing ? 0 : ps.vertices.length - 1
    const lastSeg = ps.segments.length > 0 ? ps.segments[ps.segments.length - 1] : undefined
    const firstSeg = ps.segments.length > 0 ? ps.segments[0] : undefined
    const opposite =
      options?.oppositeTangent ??
      ps.oppositeDragTangent ??
      (lastSeg ? lastSeg.tangentEnd : { x: -tx, y: -ty })

    if (options?.constrainToOpposite) {
      active = projectTangentToAxis(active, opposite)
    }

    ps.dragTangent = active
    const keepOpposite = options?.keepOpposite ?? isClosing
    if (keepOpposite) {
      ps.oppositeDragTangent = { x: opposite.x, y: opposite.y }
      applyAnchorTangent(opposite, isClosing, firstSeg, lastSeg)
      if (options?.constrainToOpposite) {
        ps.vertices[anchorIndex].handleMirroring = 'ANGLE'
      } else {
        ps.vertices[anchorIndex].handleMirroring = 'NONE'
      }
    } else {
      const symmetric = { x: -active.x, y: -active.y }
      ps.oppositeDragTangent = symmetric
      applyAnchorTangent(symmetric, isClosing, firstSeg, lastSeg)
      ps.vertices[anchorIndex].handleMirroring = 'ANGLE_AND_LENGTH'
    }
    ctx.requestRender()
  }

  function penSetClosingToFirst(closing: boolean) {
    if (!ctx.state.penState) return
    ctx.state.penState.closingToFirst = closing
    ctx.requestRender()
  }

  function penSetPendingClose(closing: boolean) {
    if (!ctx.state.penState) return
    ctx.state.penState.pendingClose = closing
    ctx.requestRepaint()
  }

  function penSetKnotPosition(x: number, y: number) {
    if (!ctx.state.penState) return
    const ps = ctx.state.penState
    const isClosing = !!ps.pendingClose && ps.vertices.length > 2
    const anchorIndex = isClosing ? 0 : ps.vertices.length - 1
    ps.vertices[anchorIndex].x = x
    ps.vertices[anchorIndex].y = y
    ctx.requestRender()
  }

  function penCommit(closed: boolean) {
    const ps = ctx.state.penState
    if (!ps || ps.vertices.length < 2) {
      ctx.state.penState = null
      ctx.state.penCursorX = null
      ctx.state.penCursorY = null
      return
    }

    if (closed && ps.pendingClose && ps.vertices.length > 2) {
      const prevIdx = ps.vertices.length - 1
      ps.segments.push({
        start: prevIdx,
        end: 0,
        tangentStart: { x: 0, y: 0 },
        tangentEnd: ps.dragTangent ?? { x: 0, y: 0 }
      })
    }

    // Curvature paths carry speculative hover tangents; recompute the final
    // smooth pass over exactly the committed vertices (cyclic when closing).
    if (ps.curvature) {
      recomputeSmoothTangents(ps, closed && ps.segments.length > ps.vertices.length - 1)
    }

    const regions: VectorRegion[] = closed
      ? [{ windingRule: 'NONZERO', loops: [ps.segments.map((_, i) => i)] }]
      : []

    const network: VectorNetwork = {
      vertices: ps.vertices.map((v) => ({ ...v })),
      segments: ps.segments.map((s) => ({
        ...s,
        tangentStart: { ...s.tangentStart },
        tangentEnd: { ...s.tangentEnd }
      })),
      regions
    }

    const bounds = computeAccurateBounds(network)

    const normalizedVertices = network.vertices.map((v) => ({
      ...v,
      x: v.x - bounds.x,
      y: v.y - bounds.y
    }))

    const normalizedNetwork: VectorNetwork = {
      vertices: normalizedVertices,
      segments: network.segments,
      regions: network.regions
    }

    const fills = ps.resumedFills ? ps.resumedFills.map((f) => ({ ...f })) : []
    const strokes = ps.resumedStrokes
      ? ps.resumedStrokes.map((s) => ({ ...s }))
      : [{ ...PEN_DEFAULT_STROKE }]

    const nodeId = createShape('VECTOR', bounds.x, bounds.y, bounds.width, bounds.height)
    ctx.graph.updateNode(nodeId, {
      vectorNetwork: normalizedNetwork,
      name: 'Vector',
      fills,
      strokes
    })
    ctx.setSelectedIds(new Set([nodeId]))

    ctx.state.penState = null
    ctx.state.penCursorX = null
    ctx.state.penCursorY = null
    ctx.setActiveTool('SELECT')
    ctx.requestRender()
  }

  function penCancel() {
    ctx.state.penState = null
    ctx.state.penCursorX = null
    ctx.state.penCursorY = null
    ctx.setActiveTool('SELECT')
    ctx.requestRender()
  }

  return {
    penAddVertex,
    penAddSmoothVertex,
    penPreviewSmoothTangent,
    penSetDragTangent,
    penSetClosingToFirst,
    penSetPendingClose,
    penSetKnotPosition,
    penCommit,
    penCancel
  }
}
