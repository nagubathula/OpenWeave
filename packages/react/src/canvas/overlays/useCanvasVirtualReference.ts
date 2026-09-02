import { useMemo, type RefObject, useState, useEffect } from 'react'

import type { Editor } from '@openweave/core/editor'
import type { Vector } from '@openweave/scene-graph/primitives'

type CanvasVirtualReference = {
  getBoundingClientRect: () => DOMRect
}

export function useCanvasVirtualReference(
  canvasRef: RefObject<HTMLElement | null>,
  editor: Editor,
  anchor: Vector | null
): CanvasVirtualReference | null {
  const [panTick, setPanTick] = useState(0)
  useEffect(
    () => editor.onEditorEvent('viewport:changed', () => setPanTick((t) => t + 1)),
    [editor]
  )
  return useMemo<CanvasVirtualReference | null>(() => {
    if (!anchor) return null

    return {
      getBoundingClientRect() {
        const canvas = canvasRef.current
        if (!canvas) return new DOMRect(0, 0, 0, 0)
        const rect = canvas.getBoundingClientRect()
        const x = rect.left + anchor.x * editor.state.zoom + editor.state.panX
        const y = rect.top + anchor.y * editor.state.zoom + editor.state.panY
        return new DOMRect(x, y, 0, 0)
      }
    }
  }, [anchor, canvasRef, editor, panTick])
}
