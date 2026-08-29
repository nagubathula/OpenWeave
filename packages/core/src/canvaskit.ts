/// <reference types="vite/client" />
import CanvasKitInit, { type CanvasKit } from 'canvaskit-wasm'

import { IS_BROWSER } from './constants'

let instance: CanvasKit | null = null

export interface CanvasKitOptions {
  locateFile?: (file: string) => string
}

export async function getCanvasKit(options?: CanvasKitOptions): Promise<CanvasKit> {
  if (instance) return instance

  const defaultLocate = (file: string) => {
    if (!IS_BROWSER) {
      const ckPath = import.meta.resolve('canvaskit-wasm')
      // Strip URL.pathname's leading slash before Windows drive letters
      // ("/D:/..."), which fs cannot open.
      return decodeURIComponent(new URL(file, ckPath).pathname).replace(/^\/([A-Za-z]:)/, '$1')
    }
    const base = 'env' in import.meta ? import.meta.env.BASE_URL : '/'
    const prefix = base === '/' ? '' : base.replace(/\/$/, '')
    return `${prefix}/${file}`
  }

  // Skia reports GPU diagnostics (e.g. "Shader compilation error" bursts when a
  // WebGL context is lost mid-flush) through Emscripten's printErr, which
  // defaults to console.error. Dev overlays surface console.error as an app
  // crash, so keep the diagnostics visible as warnings instead.
  instance = await CanvasKitInit({
    locateFile: options?.locateFile ?? defaultLocate,
    printErr: (message: string) => console.warn('[canvaskit]', message)
  } as Parameters<typeof CanvasKitInit>[0])

  return instance
}
