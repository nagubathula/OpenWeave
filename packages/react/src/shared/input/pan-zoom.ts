import { addListener } from '#react/shared/input/add-listener'
import { setupSafariGestureZoom } from '#react/shared/input/gesture'
import type { DragState } from '#react/shared/input/types'
import { setupWheelPanZoom } from '#react/shared/input/wheel'

import type { Editor } from '@openweave/core/editor'

import { type CanvasRefLike, getCanvas } from './canvas-ref'
type DragRefLike = { current?: DragState | null; value?: DragState | null }

function getDrag(ref: DragRefLike): DragState | null {
  return ref.current ?? ref.value ?? null
}
function setDragValue(ref: DragRefLike, val: DragState | null) {
  if ('current' in ref) {
    ref.current = val
  } else {
    ref.value = val
  }
}

export function setupPanZoom(
  canvasRef: CanvasRefLike,
  editor: Editor,
  drag: DragRefLike,
  onMouseDown: (e: MouseEvent) => void,
  onMouseMove: (e: MouseEvent) => void,
  onMouseUp: () => void
) {
  let activeTouches: Touch[] = []
  let pinchStartDist = 0
  let pinchStartZoom = 0
  let pinchMidX = 0
  let pinchMidY = 0

  function touchDist(a: Touch, b: Touch) {
    return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY)
  }

  let touchAsMouse = false

  function syntheticMouse(type: string, t: Touch): MouseEvent {
    return new MouseEvent(type, {
      clientX: t.clientX,
      clientY: t.clientY,
      screenX: t.screenX,
      screenY: t.screenY,
      button: 0,
      buttons: 1,
      bubbles: true
    })
  }

  function onTouchStart(e: TouchEvent) {
    e.preventDefault()
    activeTouches = Array.from(e.touches)
    const canvas = getCanvas(canvasRef)
    if (!canvas) return

    if (activeTouches.length === 2) {
      if (touchAsMouse) {
        onMouseUp()
        touchAsMouse = false
      }
      setDragValue(drag, null)
      const [a, b] = activeTouches
      pinchStartDist = touchDist(a, b)
      pinchStartZoom = editor.state.zoom
      const rect = canvas.getBoundingClientRect()
      pinchMidX = (a.clientX + b.clientX) / 2 - rect.left
      pinchMidY = (a.clientY + b.clientY) / 2 - rect.top
    } else if (activeTouches.length === 1) {
      const t = activeTouches[0]
      const tool = editor.state.activeTool
      if (tool === 'HAND') {
        touchAsMouse = false
        setDragValue(drag, {
          type: 'pan',
          startScreenX: t.clientX,
          startScreenY: t.clientY,
          startPanX: editor.state.panX,
          startPanY: editor.state.panY
        })
      } else {
        touchAsMouse = true
        onMouseDown(syntheticMouse('mousedown', t))
      }
    }
  }

  function onTouchMove(e: TouchEvent) {
    e.preventDefault()
    activeTouches = Array.from(e.touches)
    const canvas = getCanvas(canvasRef)
    if (!canvas) return

    if (activeTouches.length === 2) {
      const [a, b] = activeTouches
      const rect = canvas.getBoundingClientRect()
      const newMidX = (a.clientX + b.clientX) / 2 - rect.left
      const newMidY = (a.clientY + b.clientY) / 2 - rect.top

      editor.setHoveredNode(null)
      const newDist = touchDist(a, b)
      if (pinchStartDist > 0) {
        const scale = newDist / pinchStartDist
        const newZoom = pinchStartZoom * scale
        const panDx = newMidX - pinchMidX
        const panDy = newMidY - pinchMidY

        editor.setZoomAroundPoint(newZoom, pinchMidX, pinchMidY)
        editor.pan(panDx, panDy)
      }

      pinchMidX = newMidX
      pinchMidY = newMidY
      editor.requestRepaint()
    } else if (activeTouches.length === 1) {
      const t = activeTouches[0]
      if (touchAsMouse) {
        onMouseMove(syntheticMouse('mousemove', t))
      } else if (getDrag(drag)?.type === 'pan') {
        const d = getDrag(drag) as DragState & { type: 'pan' }
        editor.state.panX = d.startPanX + (t.clientX - d.startScreenX)
        editor.state.panY = d.startPanY + (t.clientY - d.startScreenY)
        editor.requestRepaint()
      }
    }
  }

  function onTouchEnd(e: TouchEvent) {
    e.preventDefault()
    activeTouches = Array.from(e.touches)

    if (activeTouches.length === 0) {
      if (touchAsMouse) {
        onMouseUp()
        touchAsMouse = false
      } else {
        setDragValue(drag, null)
      }
      pinchStartDist = 0
    } else if (activeTouches.length === 1) {
      const t = activeTouches[0]
      if (!touchAsMouse) {
        setDragValue(drag, {
          type: 'pan',
          startScreenX: t.clientX,
          startScreenY: t.clientY,
          startPanX: editor.state.panX,
          startPanY: editor.state.panY
        })
      }
      pinchStartDist = 0
    }
  }

  setupWheelPanZoom(canvasRef, editor)
  addListener(canvasRef, 'touchstart', (e: Event) => onTouchStart(e as TouchEvent), {
    passive: false
  })
  addListener(canvasRef, 'touchmove', (e: Event) => onTouchMove(e as TouchEvent), {
    passive: false
  })
  addListener(canvasRef, 'touchend', (e: Event) => onTouchEnd(e as TouchEvent), { passive: false })
  addListener(canvasRef, 'touchcancel', (e: Event) => onTouchEnd(e as TouchEvent), {
    passive: false
  })

  setupSafariGestureZoom(canvasRef, editor)
}
