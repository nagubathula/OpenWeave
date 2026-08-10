import { useEffect } from 'react'
import type { CanvasKit } from 'canvaskit-wasm'

import { getCanvasKit } from '@openweave/core/canvaskit'

type CanvasKitLoaderOptions = {
  canvasRef: { value: HTMLCanvasElement | null }
  lifecycle: { destroyed: boolean }
  setCanvasKit: (ck: CanvasKit | null) => void
  createSurface: (canvas: HTMLCanvasElement) => void
  loadFonts: () => Promise<unknown> | undefined
  renderNow: () => void
  onReady?: () => void
}

export function useCanvasKitLoader({
  canvasRef,
  lifecycle,
  setCanvasKit,
  createSurface,
  loadFonts,
  renderNow,
  onReady
}: CanvasKitLoaderOptions) {
  const isDestroyed = () => lifecycle.destroyed

  useEffect(() => {
    // A prior cleanup (notably React StrictMode's dev mount→unmount→remount)
    // may have flagged the shared lifecycle as destroyed. Clear it so this run
    // can initialize; `cancelled` guards the previous run's async continuation.
    lifecycle.destroyed = false
    let cancelled = false

    async function init() {
      const canvas = canvasRef.value
      if (!canvas || cancelled || isDestroyed()) return

      setCanvasKit(await getCanvasKit())
      if (cancelled || isDestroyed()) return

      // Defer one frame so layout settles before sizing the surface. Fall back
      // to a timer: requestAnimationFrame never fires while the tab is hidden,
      // and without this the canvas would stay uninitialized in a background tab.
      await new Promise<void>((resolve) => {
        const raf = requestAnimationFrame(() => resolve())
        setTimeout(() => {
          cancelAnimationFrame(raf)
          resolve()
        }, 100)
      })
      if (cancelled || isDestroyed()) return
      createSurface(canvas)
      await loadFonts()
      if (cancelled || isDestroyed()) return
      renderNow()
      onReady?.()
    }

    void init()

    return () => {
      cancelled = true
      lifecycle.destroyed = true
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}
