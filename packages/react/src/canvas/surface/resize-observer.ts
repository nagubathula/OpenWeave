import type { CanvasKit } from 'canvaskit-wasm'

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
  let resizeRaf = 0
  let observer: ResizeObserver | null = null

  function cancelResize() {
    cancelAnimationFrame(resizeRaf)
    observer?.disconnect()
    observer = null
  }

  const canvas = canvasRef.value
  if (canvas) {
    observer = new ResizeObserver(() => {
      const el = canvasRef.value
      if (!el || !getCanvasKitValue() || resizeRaf) return
      resizeRaf = requestAnimationFrame(() => {
        resizeRaf = 0
        resizeCanvas(el)
      })
    })
    observer.observe(canvas)
  }

  return { cancelResize }
}
