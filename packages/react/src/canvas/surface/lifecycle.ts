import { useEffect } from 'react'
import type { CanvasKit } from 'canvaskit-wasm'

import { SkiaRenderer } from '@openweave/core/canvas'
import type { Editor } from '@openweave/core/editor'

import {
  isCanvasContextLost,
  makeGLSurface,
  sizeCanvas,
  type CanvasGLContext
} from '#react/canvas/surface/gl-surface'
import { useCanvasKitLoader } from '#react/canvas/surface/kit-loader'
import { createCanvasRenderLoop } from '#react/canvas/surface/render-loop'
import { useCanvasResizeObserver } from '#react/canvas/surface/resize-observer'
import type { UseCanvasOptions } from '#react/canvas/surface/types'

type SurfaceManagerState = {
  renderer: SkiaRenderer | null
  glContext: CanvasGLContext | null
}

export function createCanvasSurfaceManager({
  editor,
  canvasRef,
  options,
  getCanvasKit,
  isDestroyed,
  shouldShowRulers
}: {
  editor: Editor
  canvasRef: { value: HTMLCanvasElement | null }
  options: UseCanvasOptions | undefined
  getCanvasKit: () => CanvasKit | null
  isDestroyed: () => boolean
  shouldShowRulers: () => boolean
}) {
  const state: SurfaceManagerState = { renderer: null, glContext: null }
  let sceneBackingRenderTimer: ReturnType<typeof setTimeout> | null = null

  function clearSceneBackingRenderTimer() {
    if (sceneBackingRenderTimer === null) return
    clearTimeout(sceneBackingRenderTimer)
    sceneBackingRenderTimer = null
  }

  function createSurface(
    canvas: HTMLCanvasElement,
    { reloadFonts = false }: { reloadFonts?: boolean } = {}
  ) {
    const ck = getCanvasKit()
    if (!ck) return

    if (state.renderer) editor.removeCanvasRenderer(state.renderer)
    state.renderer?.destroy()
    state.renderer = null
    state.glContext?.delete()
    state.glContext = null

    sizeCanvas(canvas, editor)

    const result = makeGLSurface(ck, canvas, editor, options, state.glContext)
    state.glContext = result.glContext
    const surface = result.surface
    if (!surface) {
      canvas.dataset.surfaceError = 'webgl'
      return
    }

    const glCtx = canvas.getContext('webgl2') ?? null
    state.renderer = new SkiaRenderer(ck, surface, glCtx)
    editor.setCanvasKit(ck, state.renderer)
    canvas.dataset.ready = '1'

    // When the surface is recreated after a resize fallback, destroyRenderer
    // has cleared the module-level fontProvider — the new renderer must reload.
    // On initial mount, kit-loader.init() handles loadFonts, so skip here.
    if (reloadFonts && !isDestroyed()) {
      void state.renderer.loadFonts(renderNow).then(() => {
        if (!isDestroyed()) renderNow()
        return undefined
      })
    }
  }

  function renderNow() {
    if (!state.renderer || isDestroyed()) return
    const canvas = canvasRef.value
    // Skip rendering to a dead GPU context; the restore handler rebuilds it.
    if (canvas && isCanvasContextLost(canvas)) return
    try {
      state.renderer.renderFromEditorState(
        editor.state,
        editor.graph,
        editor.textEditor,
        canvas?.clientWidth ?? 0,
        canvas?.clientHeight ?? 0,
        shouldShowRulers(),
        options?.layer ?? 'full'
      )
    } catch {
      // Transient GPU failure (e.g. context lost mid-frame); recover on restore.
      return
    }
    renderLoop.markRendered()
    clearSceneBackingRenderTimer()
    if (options?.layer === 'scene' && state.renderer.sceneBackingNeedsCrispRender) {
      const delay = Math.max(0, state.renderer.sceneBackingPreviewUntil - performance.now())
      sceneBackingRenderTimer = setTimeout(() => renderLoop.markDirty(), delay)
    }
  }

  const renderLoop = createCanvasRenderLoop(editor, renderNow, { layer: options?.layer })

  function resizeCanvas(canvas: HTMLCanvasElement) {
    const ck = getCanvasKit()
    if (!ck || !state.renderer) {
      createSurface(canvas)
      return
    }

    sizeCanvas(canvas, editor)

    const result = makeGLSurface(ck, canvas, editor, options, state.glContext)
    state.glContext = result.glContext
    const surface = result.surface
    if (!surface) {
      console.warn('Falling back to full surface recreation after resize')
      createSurface(canvas, { reloadFonts: true })
      return
    }
    state.renderer.replaceSurface(surface)
    renderNow()
  }

  function destroy() {
    clearSceneBackingRenderTimer()
    renderLoop.pause()
    if (state.renderer) editor.removeCanvasRenderer(state.renderer)
    state.renderer?.destroy()
    state.glContext?.delete()
    state.glContext = null
    state.renderer = null
    // Proactively free the underlying WebGL context so rapid remounts/HMR don't
    // pile up contexts and trip the browser's per-page limit (→ CONTEXT_LOST).
    const canvas = canvasRef.value
    const gl = canvas?.getContext('webgl2') ?? canvas?.getContext('webgl')
    gl?.getExtension('WEBGL_lose_context')?.loseContext()
  }

  return {
    createSurface,
    resizeCanvas,
    renderNow,
    destroy,
    markDirty: renderLoop.markDirty,
    getRenderer: () => state.renderer
  }
}

export function useCanvasSurfaceLifecycle({
  canvasRef,
  surface,
  setCanvasKit,
  getCanvasKitValue,
  lifecycle,
  onReady
}: {
  canvasRef: { value: HTMLCanvasElement | null }
  surface: ReturnType<typeof createCanvasSurfaceManager>
  setCanvasKit: (ck: CanvasKit | null) => void
  getCanvasKitValue: () => CanvasKit | null
  lifecycle: { destroyed: boolean }
  onReady?: () => void
}) {
  useCanvasKitLoader({
    canvasRef,
    lifecycle,
    setCanvasKit,
    createSurface: surface.createSurface,
    loadFonts: () => surface.getRenderer()?.loadFonts(surface.renderNow),
    renderNow: surface.renderNow,
    onReady
  })

  const { cancelResize } = useCanvasResizeObserver({
    canvasRef,
    getCanvasKitValue,
    resizeCanvas: surface.resizeCanvas
  })

  useEffect(() => {
    const canvas = canvasRef.value

    // WebGL contexts can be lost (GPU reset, too many contexts, tab backgrounding).
    // preventDefault() on 'lost' is required for the browser to fire 'restored';
    // then we rebuild the Skia surface on the fresh context.
    const onContextLost = (event: Event) => {
      event.preventDefault()
      const c = canvasRef.value
      if (c) c.dataset.surfaceError = 'context-lost'
    }
    const onContextRestored = () => {
      const c = canvasRef.value
      if (!c || lifecycle.destroyed) return
      delete c.dataset.surfaceError
      surface.createSurface(c, { reloadFonts: true })
      surface.renderNow()
    }

    canvas?.addEventListener('webglcontextlost', onContextLost)
    canvas?.addEventListener('webglcontextrestored', onContextRestored)

    return () => {
      canvas?.removeEventListener('webglcontextlost', onContextLost)
      canvas?.removeEventListener('webglcontextrestored', onContextRestored)
      lifecycle.destroyed = true
      cancelResize()
      surface.destroy()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}
