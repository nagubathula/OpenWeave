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

/**
 * Catmull-Rom tangent (as a cubic-bezier control offset) at vertex `i`.
 * Open paths reflect the neighbor across each endpoint, which keeps a
 * two-point path perfectly straight; closed paths wrap cyclically.
 */
function smoothTangentAt(vertices: PenState['vertices'], i: number, closed: boolean): Vector {
  const n = vertices.length
  const v = vertices[i]
  const prev = closed
    ? vertices[(i - 1 + n) % n]
    : i > 0
      ? vertices[i - 1]
      : { x: 2 * v.x - vertices[1].x, y: 2 * v.y - vertices[1].y }
  const next = closed
    ? vertices[(i + 1) % n]
    : i < n - 1
      ? vertices[i + 1]
      : { x: 2 * v.x - vertices[n - 2].x, y: 2 * v.y - vertices[n - 2].y }
  return { x: (next.x - prev.x) / 6, y: (next.y - prev.y) / 6 }
}

/** Recompute every segment's tangents so the path curves smoothly through all vertices. */
function recomputeSmoothTangents(ps: PenState, closed: boolean): void {
  if (ps.vertices.length < 2) return
  const tangents = ps.vertices.map((_, i) => smoothTangentAt(ps.vertices, i, closed))
  for (const seg of ps.segments) {
    const ts = tangents[seg.start]
    const te = tangents[seg.end]
    seg.tangentStart = { x: ts.x, y: ts.y }
    seg.tangentEnd = { x: -te.x, y: -te.y }
  }
  const last = ps.vertices.length - 1
  for (let i = 0; i < ps.vertices.length; i++) {
    if (closed || (i > 0 && i < last)) ps.vertices[i].handleMirroring = 'ANGLE_AND_LENGTH'
  }
}

export function createPenActions(ctx: EditorContext, createShape: CreateShape) {
  function penAddVertex(x: number, y: number) {
    if (!ctx.state.penState) {
      ctx.state.penState = {
        vertices: [{ x, y }],
        segments: [],
        dragTangent: null,
        oppositeDragTangent: null,
        pendingClose: false,
        closingToFirst: false
      }
      ctx.requestRender()
      return
    }

    const ps = ctx.state.penState
    const prevIdx = ps.vertices.length - 1

    ps.vertices.push({ x, y })
    const newIdx = ps.vertices.length - 1
    ps.segments.push({
      start: prevIdx,
      end: newIdx,
      tangentStart: ps.dragTangent ?? { x: 0, y: 0 },
      tangentEnd: { x: 0, y: 0 }
    })
    ps.dragTangent = null
    ps.oppositeDragTangent = null
    ps.pendingClose = false
    ps.curvature = false
    ctx.requestRender()
  }

  function penAddSmoothVertex(x: number, y: number) {
    if (!ctx.state.penState) {
      ctx.state.penState = {
        vertices: [{ x, y }],
        segments: [],
        dragTangent: null,
        oppositeDragTangent: null,
        pendingClose: false,
        closingToFirst: false,
        curvature: true
      }
      ctx.requestRender()
      return
    }

    const ps = ctx.state.penState
    const prevIdx = ps.vertices.length - 1

    ps.vertices.push({ x, y })
    ps.segments.push({
      start: prevIdx,
      end: ps.vertices.length - 1,
      tangentStart: { x: 0, y: 0 },
      tangentEnd: { x: 0, y: 0 }
    })
    ps.dragTangent = null
    ps.oppositeDragTangent = null
    ps.pendingClose = false
    ps.curvature = true
    recomputeSmoothTangents(ps, false)
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
    const last = ps.vertices.length - 1
    const tangent = {
      x: (cx - ps.vertices[last - 1].x) / 6,
      y: (cy - ps.vertices[last - 1].y) / 6
    }
    const lastSeg = ps.segments[ps.segments.length - 1]
    lastSeg.tangentEnd = { x: -tangent.x, y: -tangent.y }
    ps.dragTangent = tangent
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
