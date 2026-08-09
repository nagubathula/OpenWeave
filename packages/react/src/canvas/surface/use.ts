import type { CanvasKit } from 'canvaskit-wasm'
import type { RefObject } from 'react'

import type { Editor } from '@openweave/core/editor'

import {
  createCanvasSurfaceManager,
  useCanvasSurfaceLifecycle
} from '#react/canvas/surface/lifecycle'
import { createCanvasHitTests, createRulerVisibility } from '#react/canvas/surface/overlays'
import type { UseCanvasOptions } from '#react/canvas/surface/types'

export type { UseCanvasOptions } from '#react/canvas/surface/types'

/**
 * Connects an OpenWeave editor to a real canvas element using CanvasKit.
 *
 * This composable owns renderer creation, surface recreation on resize,
 * render scheduling, and renderer-backed hit testing helpers used by higher-
 * level canvas interaction code.
 */
export function useCanvas(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  editor: Editor,
  options?: UseCanvasOptions
) {
  // Canvas surface code expects a .value accessor (Vue-style).
  // Wrap the React .current ref into a .value adapter.
  const canvasRefAdapter = {
    get value() { return canvasRef.current }
  }

  let ck: CanvasKit | null = null
  const lifecycle: { destroyed: boolean } = { destroyed: false }
  const isDestroyed = () => lifecycle.destroyed
  const shouldShowRulers = createRulerVisibility(options)

  const surface = createCanvasSurfaceManager({
    editor,
    canvasRef: canvasRefAdapter,
    options,
    getCanvasKit: () => ck,
    isDestroyed,
    shouldShowRulers
  })

  useCanvasSurfaceLifecycle({
    canvasRef: canvasRefAdapter,
    surface,
    lifecycle,
    getCanvasKitValue: () => ck,
    setCanvasKit: (value) => {
      ck = value
    },
    onReady: options?.onReady
  })

  const { hitTestSectionTitle, hitTestComponentLabel, hitTestFrameTitle } = createCanvasHitTests(
    editor,
    surface.getRenderer
  )

  return {
    render: surface.markDirty,
    renderNow: surface.renderNow,
    hitTestSectionTitle,
    hitTestComponentLabel,
    hitTestFrameTitle
  }
}
