import type React from 'react'

import type { EditorStore } from '@/app/editor/active-store'

export function createCanvasContextSelection(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  store: EditorStore
) {
  function selectAtContextPoint(event: React.MouseEvent) {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const { x: cx, y: cy } = store.screenToCanvas(
      event.clientX - rect.left,
      event.clientY - rect.top
    )
    store.selectAtPoint(cx, cy)
  }

  return { selectAtContextPoint }
}
