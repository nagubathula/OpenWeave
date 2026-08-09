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
    async function init() {
      const canvas = canvasRef.value
      if (!canvas || isDestroyed()) return

      setCanvasKit(await getCanvasKit())
      if (isDestroyed()) return

      await new Promise((resolve) => {
        requestAnimationFrame(resolve)
      })
      createSurface(canvas)
      await loadFonts()
      if (isDestroyed()) return
      renderNow()
      onReady?.()
    }

    void init()

    return () => {
      lifecycle.destroyed = true
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}
