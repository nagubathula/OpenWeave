import {
  getNodeEditState,
  hitTestEditHandle,
  hitTestEditVertex,
  isEndpoint
} from '#react/shared/input/node-edit/hit-test'
import type { DragEditHandle, DragEditNode, DragState } from '#react/shared/input/types'

export {
  getNodeEditState,
  hitTestEditHandle,
  isEndpoint,
  NODE_HIT_THRESHOLD
} from '#react/shared/input/node-edit/hit-test'
import type { Editor } from '@openweave/core/editor'
import { nearestPointOnNetwork } from '@openweave/core/vector'
import type { Vector } from '@openweave/scene-graph/primitives'

type NodeEditEditor = Partial<{
  nodeEditSelectVertex: (vertexIndex: number, addToSelection: boolean) => void
  exitNodeEditMode: (commit: boolean) => void
  nodeEditRemoveVertex: (vertexIndex: number) => void
  nodeEditToggleVertexSmooth: (vertexIndex: number) => void
  penResumeFromEndpoint: (nodeId: string, endpointVertexIndex: number) => void
  nodeEditAddVertex: (cx: number, cy: number) => void
  nodeEditPushHistory: () => void
  nodeEditSetHandle: (
    segmentIndex: number,
    tangentField: 'tangentStart' | 'tangentEnd',
    newTangent: Vector,
    options?: {
      breakMirroring?: boolean
      continuous?: boolean
      lockDirection?: boolean
    }
  ) => void
}>

export function handleNodeEditDown(
  e: MouseEvent,
  cx: number,
  cy: number,
  editor: Editor,
  setDrag: (d: DragState) => void
) {
  const es = getNodeEditState(editor)
  if (!es) return
  const nodeEditEditor = editor as Editor & NodeEditEditor

  const handleHit = hitTestEditHandle(editor, cx, cy)
  if (handleHit) {
    const key = `${handleHit.segmentIndex}:${handleHit.tangentField}`
    if (e.shiftKey) {
      const next = new Set(es.selectedHandles)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      es.selectedHandles = next
    } else {
      es.selectedVertexIndices = new Set()
      es.selectedHandles = new Set([key])
    }
    nodeEditEditor.nodeEditPushHistory?.()
    setDrag({
      type: 'edit-handle',
      segmentIndex: handleHit.segmentIndex,
      tangentField: handleHit.tangentField,
      vertexIndex: handleHit.vertexIndex,
      startX: cx,
      startY: cy,
      initialTangent: (() => {
        const seg = es.segments[handleHit.segmentIndex]
        const tangent =
          handleHit.tangentField === 'tangentStart' ? seg.tangentStart : seg.tangentEnd
        return { x: tangent.x, y: tangent.y }
      })()
    })
    return
  }

  const vi = hitTestEditVertex(editor, cx, cy)
  if (vi !== null) {
    if (!e.shiftKey) es.selectedHandles = new Set()

    if (editor.state.activeTool === 'BEND') {
      if (e.altKey) {
        nodeEditEditor.nodeEditToggleVertexSmooth?.(vi)
        return
      }
      nodeEditEditor.nodeEditSelectVertex?.(vi, false)
      nodeEditEditor.nodeEditPushHistory?.()
      setDrag({
        type: 'bend-handle',
        vertexIndex: vi,
        startX: es.vertices[vi].x,
        startY: es.vertices[vi].y,
        lockedMode: null,
        dragSamples: [],
        targetSegmentIndex: null,
        targetTangentField: null
      })
      return
    }

    if (e.metaKey || e.ctrlKey) {
      nodeEditEditor.nodeEditSelectVertex?.(vi, false)
      nodeEditEditor.nodeEditPushHistory?.()
      setDrag({
        type: 'bend-handle',
        vertexIndex: vi,
        startX: es.vertices[vi].x,
        startY: es.vertices[vi].y,
        lockedMode: null,
        dragSamples: [],
        targetSegmentIndex: null,
        targetTangentField: null
      })
      return
    }

    if (!(es.selectedVertexIndices.has(vi) && !e.shiftKey)) {
      nodeEditEditor.nodeEditSelectVertex?.(vi, e.shiftKey)
    }

    const origPositions = new Map<number, Vector>()
    for (const idx of es.selectedVertexIndices) {
      origPositions.set(idx, { x: es.vertices[idx].x, y: es.vertices[idx].y })
    }
    if (!origPositions.has(vi)) {
      origPositions.set(vi, { x: es.vertices[vi].x, y: es.vertices[vi].y })
    }

    nodeEditEditor.nodeEditPushHistory?.()
    setDrag({
      type: 'edit-node',
      startX: cx,
      startY: cy,
      origPositions
    })
    return
  }

  // Check if a segment is clicked to bend
  const liveNetwork = { vertices: es.vertices, segments: es.segments, regions: [] }
  const nearest = nearestPointOnNetwork(cx, cy, liveNetwork, 10 / editor.state.zoom)
  if (nearest && (editor.state.activeTool === 'BEND' || e.metaKey || e.ctrlKey)) {
    const seg = es.segments[nearest.segmentIndex]
    nodeEditEditor.nodeEditPushHistory?.()
    setDrag({
      type: 'bend-segment',
      segmentIndex: nearest.segmentIndex,
      startX: cx,
      startY: cy,
      t: nearest.t,
      initialTangentStart: { x: seg.tangentStart.x, y: seg.tangentStart.y },
      initialTangentEnd: { x: seg.tangentEnd.x, y: seg.tangentEnd.y },
      initialPoint: { x: nearest.x, y: nearest.y }
    })
    return
  }

  if (editor.state.activeTool !== 'BEND') {
    nodeEditEditor.exitNodeEditMode?.(true)
  }
}

export function handlePenNodeEditDown(e: MouseEvent, cx: number, cy: number, editor: Editor) {
  const es = getNodeEditState(editor)
  if (!es) return
  const nodeEditEditor = editor as Editor & NodeEditEditor

  const vi = hitTestEditVertex(editor, cx, cy)
  if (vi !== null) {
    if (e.altKey) {
      nodeEditEditor.nodeEditRemoveVertex?.(vi)
      return
    }
    if (isEndpoint(vi, es.segments)) {
      const nodeId = es.nodeId
      nodeEditEditor.exitNodeEditMode?.(true)
      nodeEditEditor.penResumeFromEndpoint?.(nodeId, vi)
    }
    return
  }

  nodeEditEditor.nodeEditAddVertex?.(cx, cy)
}

export function handleNodeEditMove(
  d: DragEditNode | DragEditHandle,
  cx: number,
  cy: number,
  editor: Editor,
  breakMirroring?: boolean,
  continuous?: boolean,
  lockDirection?: boolean
) {
  const nodeEditEditor = editor as Editor & NodeEditEditor
  if (d.type === 'edit-node') {
    const dx = cx - d.startX
    const dy = cy - d.startY
    const es = getNodeEditState(editor)
    if (!es) return

    for (const [idx, orig] of d.origPositions) {
      es.vertices[idx] = {
        ...es.vertices[idx],
        x: orig.x + dx,
        y: orig.y + dy
      }
    }
    editor.requestRepaint()
    return
  }
  const es = getNodeEditState(editor)
  if (!es) return
  const vertex = es.vertices[d.vertexIndex]
  let newTangent = { x: cx - vertex.x, y: cy - vertex.y }
  const canLockDirection =
    lockDirection &&
    (vertex.handleMirroring === 'ANGLE' || vertex.handleMirroring === 'ANGLE_AND_LENGTH')
  if (canLockDirection && d.initialTangent) {
    const len = Math.hypot(d.initialTangent.x, d.initialTangent.y)
    if (len > 1e-6) {
      const dir = { x: d.initialTangent.x / len, y: d.initialTangent.y / len }
      const projectedLen = Math.max(0, newTangent.x * dir.x + newTangent.y * dir.y)
      newTangent = { x: dir.x * projectedLen, y: dir.y * projectedLen }
    }
  }
  nodeEditEditor.nodeEditSetHandle?.(d.segmentIndex, d.tangentField, newTangent, {
    breakMirroring,
    continuous,
    lockDirection
  })
}
