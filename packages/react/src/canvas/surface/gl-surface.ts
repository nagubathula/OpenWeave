import type { UseCanvasOptions } from '#react/canvas/surface/types'
import type { CanvasKit, Surface } from 'canvaskit-wasm'

import type { Editor } from '@openweave/core/editor'

type GLContext = ReturnType<CanvasKit['MakeGrContext']>

export type CanvasGLContext = GLContext

export function sizeCanvas(canvas: HTMLCanvasElement, editor: Editor) {
  const dpr = window.devicePixelRatio || 1
  canvas.width = canvas.clientWidth * dpr
  canvas.height = canvas.clientHeight * dpr
  if ('setViewportSize' in editor && typeof editor.setViewportSize === 'function') {
    editor.setViewportSize(canvas.clientWidth, canvas.clientHeight)
  }
}

export function isCanvasContextLost(canvas: HTMLCanvasElement): boolean {
  const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl')
  return !!gl && gl.isContextLost()
}

export function makeGLSurface(
  ck: CanvasKit,
  canvas: HTMLCanvasElement,
  editor: Editor,
  options: UseCanvasOptions | undefined,
  glContext: GLContext | null
): { surface: Surface | null; glContext: GLContext | null } {
  // A lost WebGL context makes the CanvasKit calls below throw. Bail out
  // gracefully so the resize/recreation path doesn't crash-loop; the
  // webglcontextrestored handler will rebuild once the GPU comes back.
  if (isCanvasContextLost(canvas)) return { surface: null, glContext: null }

  try {
    let context = glContext
    if (!context) {
      const glAttrs = options?.preserveDrawingBuffer ? { preserveDrawingBuffer: 1 } : undefined
      const handle = ck.GetWebGLContext(canvas, glAttrs)
      if (!handle) return { surface: null, glContext: context }
      context = ck.MakeGrContext(handle)
    }
    if (!context) return { surface: null, glContext: context }

    const preferredSpace = editor.graph.documentColorSpace
    const colorSpaces =
      preferredSpace === 'display-p3'
        ? [ck.ColorSpace.DISPLAY_P3, ck.ColorSpace.SRGB]
        : [ck.ColorSpace.SRGB]

    for (const colorSpace of colorSpaces) {
      const surface = ck.MakeOnScreenGLSurface(context, canvas.width, canvas.height, colorSpace)
      if (surface) return { surface, glContext: context }
    }

    return { surface: null, glContext: context }
  } catch {
    // Context can be lost mid-call; treat as a transient failure.
    return { surface: null, glContext: null }
  }
}
