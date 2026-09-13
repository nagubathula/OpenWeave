import { useStore } from '@nanostores/react'
import React, { useEffect, useRef, useState } from 'react'

import { useSelectionState } from '@openweave/react'
import { getWorldMatrix } from '@openweave/scene-graph/coordinate'
import Matrix from '@openweave/scene-graph/matrix'

import type { EditorStore } from '@/app/editor/active-store'
import {
  addKeyframe,
  interpolateProperty,
  nodeTracksStore,
  seek,
  timelineStore
} from '@/app/motion/store'
import Tip from '@/components/ui/Tip'

interface MotionTrajectoryOverlayProps {
  containerRef: React.RefObject<HTMLDivElement | null>
  store: EditorStore
  activeTab: string
}

interface Waypoint {
  id: string
  timeMs: number
  localX: number
  localY: number
  screenX: number
  screenY: number
}

export default function MotionTrajectoryOverlay({
  containerRef,
  store,
  activeTab
}: MotionTrajectoryOverlayProps) {
  const { selectedNode } = useSelectionState()
  const tracks = useStore(nodeTracksStore)
  const { currentTimeMs } = useStore(timelineStore)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  const [draggingWaypoint, setDraggingWaypoint] = useState<Waypoint | null>(null)
  const [, setViewportTick] = useState(0)

  // Re-render when viewport pans or zooms
  useEffect(() => {
    return store.onEditorEvent('viewport:changed', () => {
      setViewportTick((t) => t + 1)
    })
  }, [store])

  const isMotion = activeTab === 'motion'
  const nodeTrack = selectedNode ? tracks[selectedNode.id] : undefined
  const xTrack = isMotion ? nodeTrack?.tracks.x : undefined
  const yTrack = isMotion ? nodeTrack?.tracks.y : undefined

  // Collect unique times from x and y tracks
  const timesSet = new Set<number>()
  if (xTrack) {
    for (const kf of xTrack.keyframes) timesSet.add(kf.timeMs)
  }
  if (yTrack) {
    for (const kf of yTrack.keyframes) timesSet.add(kf.timeMs)
  }

  const sortedTimes = Array.from(timesSet).sort((a, b) => a - b)
  const hasValidTrajectory = isMotion && Boolean(selectedNode) && sortedTimes.length >= 2

  const zoom = store.state.zoom
  const panX = store.state.panX
  const panY = store.state.panY

  const baseNodeX = selectedNode?.x ?? 0
  const baseNodeY = selectedNode?.y ?? 0

  let parentMatrix = Matrix.identity()
  if (selectedNode?.parentId) {
    const parent = store.graph.getNode(selectedNode.parentId)
    if (parent) {
      parentMatrix = getWorldMatrix(parent, store.graph)
    }
  }

  const waypoints: Waypoint[] = hasValidTrajectory
    ? sortedTimes.map((timeMs, idx) => {
        const localX = xTrack ? (interpolateProperty(xTrack, timeMs) ?? baseNodeX) : baseNodeX
        const localY = yTrack ? (interpolateProperty(yTrack, timeMs) ?? baseNodeY) : baseNodeY

        const [globalX, globalY] = Matrix.mapPoints(parentMatrix, [localX, localY])
        const screenX = globalX * zoom + panX
        const screenY = globalY * zoom + panY

        return {
          id: `wp-${idx}-${timeMs}`,
          timeMs,
          localX,
          localY,
          screenX,
          screenY
        }
      })
    : []

  // Current playhead position on trajectory
  const curLocalX = xTrack ? (interpolateProperty(xTrack, currentTimeMs) ?? baseNodeX) : baseNodeX
  const curLocalY = yTrack ? (interpolateProperty(yTrack, currentTimeMs) ?? baseNodeY) : baseNodeY
  const [curGlobalX, curGlobalY] = Matrix.mapPoints(parentMatrix, [curLocalX, curLocalY])
  const curScreenX = curGlobalX * zoom + panX
  const curScreenY = curGlobalY * zoom + panY

  // Draw the dashed trajectory path on overlay canvas (unconditional hook)
  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1
    const w = container.clientWidth
    const h = container.clientHeight

    canvas.width = w * dpr
    canvas.height = h * dpr
    ctx.scale(dpr, dpr)
    ctx.clearRect(0, 0, w, h)

    if (!hasValidTrajectory || waypoints.length < 2) return

    // Trajectory path
    ctx.strokeStyle = '#3b82f6'
    ctx.lineWidth = 1.5
    ctx.setLineDash([4, 4])
    ctx.beginPath()

    const first = waypoints[0]
    if (first) {
      ctx.moveTo(first.screenX, first.screenY)
      for (let i = 1; i < waypoints.length; i++) {
        const wp = waypoints[i]
        if (wp) ctx.lineTo(wp.screenX, wp.screenY)
      }
    }
    ctx.stroke()
    ctx.setLineDash([])

    // Glowing playhead pulse circle on path
    ctx.fillStyle = '#3b82f6'
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(curScreenX, curScreenY, 5, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
  }, [waypoints, curScreenX, curScreenY, containerRef, hasValidTrajectory])

  const handleWaypointPointerDown = (wp: Waypoint, e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation()
    setDraggingWaypoint(wp)
    seek(wp.timeMs)
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const handleWaypointPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingWaypoint || !containerRef.current || !selectedNode) return
    const rect = containerRef.current.getBoundingClientRect()
    const mouseScreenX = e.clientX - rect.left
    const mouseScreenY = e.clientY - rect.top

    const { x: newGlobalX, y: newGlobalY } = store.screenToCanvas(mouseScreenX, mouseScreenY)

    let localX = newGlobalX
    let localY = newGlobalY
    const invParent = Matrix.invert(parentMatrix)
    if (invParent) {
      const mapped = Matrix.mapPoints(invParent, [newGlobalX, newGlobalY])
      localX = mapped[0] ?? newGlobalX
      localY = mapped[1] ?? newGlobalY
    }

    const roundedX = Math.round(localX)
    const roundedY = Math.round(localY)

    if (xTrack) {
      addKeyframe(
        selectedNode.id,
        selectedNode.name || 'Layer',
        'x',
        roundedX,
        draggingWaypoint.timeMs
      )
    }
    if (yTrack) {
      addKeyframe(
        selectedNode.id,
        selectedNode.name || 'Layer',
        'y',
        roundedY,
        draggingWaypoint.timeMs
      )
    }

    selectedNode.x = roundedX
    selectedNode.y = roundedY
    store.requestRepaint()
  }

  const handleWaypointPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (draggingWaypoint) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId)
      } catch {
        // Safe release
      }
      setDraggingWaypoint(null)
    }
  }

  if (!hasValidTrajectory || waypoints.length < 2) {
    return null
  }

  return (
    <div className="pointer-events-none absolute inset-0 z-30 size-full overflow-hidden">
      {/* Dashed trajectory canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 size-full" />

      {/* Interactive waypoint pins on canvas */}
      {waypoints.map((wp, idx) => {
        const isCurrent = Math.abs(wp.timeMs - currentTimeMs) <= 15
        return (
          <div
            key={wp.id}
            style={{
              left: `${wp.screenX}px`,
              top: `${wp.screenY}px`
            }}
            className="pointer-events-auto absolute -translate-x-1/2 -translate-y-1/2"
          >
            <Tip
              label={`Waypoint ${idx + 1} (${Math.round(wp.timeMs)}ms): X=${Math.round(wp.localX)}, Y=${Math.round(wp.localY)}`}
            >
              <div
                className={`size-3 cursor-grab active:cursor-grabbing rounded-full border-2 shadow-md transition-transform hover:scale-125 ${
                  isCurrent
                    ? 'border-white bg-accent ring-2 ring-accent/60 shadow-[0_0_8px_rgba(59,130,246,0.8)]'
                    : 'border-accent bg-panel hover:bg-accent'
                }`}
                onPointerDown={(e) => handleWaypointPointerDown(wp, e)}
                onPointerMove={handleWaypointPointerMove}
                onPointerUp={handleWaypointPointerUp}
                onPointerCancel={handleWaypointPointerUp}
              />
            </Tip>
          </div>
        )
      })}
    </div>
  )
}
