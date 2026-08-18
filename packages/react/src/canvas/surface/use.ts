import {
  createCanvasSurfaceManager,
  useCanvasSurfaceLifecycle
} from '#react/canvas/surface/lifecycle'
import { createCanvasHitTests, createRulerVisibility } from '#react/canvas/surface/overlays'
import type { UseCanvasOptions } from '#react/canvas/surface/types'
import type { CanvasKit } from 'canvaskit-wasm'
import { useMemo, useRef, type RefObject } from 'react'

import type { Editor } from '@openweave/core/editor'

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
  const canvasRefAdapter = useMemo(
    () => ({
      get value() {
        return canvasRef.current
      }
    }),
    [canvasRef]
  )

  // CanvasKit handle and lifecycle flag must stay stable across renders — the
  // init effect writes them, and the render loop/renderNow read them.
  const ckRef = useRef<CanvasKit | null>(null)
  const lifecycleRef = useRef<{ destroyed: boolean }>({ destroyed: false })

  // `createRulerVisibility` calls a hook, so it must run every render; expose the
  // latest through a ref so the stable surface can read it.
  const shouldShowRulers = createRulerVisibility(options)
  const shouldShowRulersRef = useRef(shouldShowRulers)
  shouldShowRulersRef.current = shouldShowRulers

  // The surface manager owns the SkiaRenderer, GL surface, and render loop. It
  // MUST be a single stable instance: the init effect sets its renderer, and the
  // render loop + returned renderNow must read that same instance. Recreating it
  // per render (the previous behavior) left the render loop pointed at an
  // instance whose renderer was never initialized, so nothing ever painted.
  const surfaceRef = useRef<ReturnType<typeof createCanvasSurfaceManager> | null>(null)
  if (!surfaceRef.current) {
    surfaceRef.current = createCanvasSurfaceManager({
      editor,
      canvasRef: canvasRefAdapter,
      options,
      getCanvasKit: () => ckRef.current,
      isDestroyed: () => lifecycleRef.current.destroyed,
      shouldShowRulers: () => shouldShowRulersRef.current()
    })
  }
  const surface = surfaceRef.current

  useCanvasSurfaceLifecycle({
    canvasRef: canvasRefAdapter,
    surface,
    lifecycle: lifecycleRef.current,
    getCanvasKitValue: () => ckRef.current,
    setCanvasKit: (value) => {
      ckRef.current = value
    },
    onReady: options?.onReady
  })

  const { hitTestSectionTitle, hitTestComponentLabel, hitTestFrameTitle } = useMemo(
    () => createCanvasHitTests(editor, surface.getRenderer),
    [editor, surface]
  )

  return {
    render: surface.markDirty,
    renderNow: surface.renderNow,
    hitTestSectionTitle,
    hitTestComponentLabel,
    hitTestFrameTitle
  }
}
