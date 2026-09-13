import type { CanvasKit } from 'canvaskit-wasm'
import { useCallback, useEffect, useRef } from 'react'

type ResizeObserverOptions = {
  canvasRef: { value: HTMLCanvasElement | null }
  getCanvasKitValue: () => CanvasKit | null
  resizeCanvas: (canvas: HTMLCanvasElement) => void
}

export function useCanvasResizeObserver({
  canvasRef,
  getCanvasKitValue,
  resizeCanvas
}: ResizeObserverOptions) {
  const resizeRafRef = useRef(0)
  const observerRef = useRef<ResizeObserver | null>(null)

  const cancelResize = useCallback(() => {
    if (resizeRafRef.current) {
      cancelAnimationFrame(resizeRafRef.current)
      resizeRafRef.current = 0
    }
    observerRef.current?.disconnect()
    observerRef.current = null
  }, [])

  useEffect(() => {
    const canvas = canvasRef.value
    if (!canvas) return

    const observer = new ResizeObserver(() => {
      const el = canvasRef.value
      if (!el || !getCanvasKitValue() || resizeRafRef.current) return
      resizeRafRef.current = requestAnimationFrame(() => {
        resizeRafRef.current = 0
        resizeCanvas(el)
      })
    })

    observerRef.current = observer
    observer.observe(canvas)

    return () => {
      cancelResize()
    }
  }, [canvasRef, getCanvasKitValue, resizeCanvas, cancelResize])

  return { cancelResize }
}
