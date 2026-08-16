import type { SkiaRenderer } from '@openweave/core/canvas'
import { IS_BROWSER } from '@openweave/core/constants'
import type { Editor } from '@openweave/core/editor'

import { isMobileViewport } from '#react/editor/viewport-kind/use'

export type RulerVisibilityOptions = {
  showRulers?: boolean
}

export function createRulerVisibility(options?: RulerVisibilityOptions) {
  const params = IS_BROWSER ? new URLSearchParams(window.location.search) : new URLSearchParams()
  const noRulersParam = params.has('no-rulers')

  return function shouldShowRulers() {
    if (options?.showRulers === false) return false
    return !noRulersParam && !isMobileViewport()
  }
}

export function createCanvasHitTests(editor: Editor, getRenderer: () => SkiaRenderer | null) {
  function hitTestSectionTitle(canvasX: number, canvasY: number) {
    return getRenderer()?.hitTestSectionTitle(editor.graph, canvasX, canvasY) ?? null
  }

  function hitTestComponentLabel(canvasX: number, canvasY: number) {
    return getRenderer()?.hitTestComponentLabel(editor.graph, canvasX, canvasY) ?? null
  }

  function hitTestFrameTitle(canvasX: number, canvasY: number) {
    return (
      getRenderer()?.hitTestFrameTitle(editor.graph, canvasX, canvasY, editor.state.selectedIds) ??
      null
    )
  }

  return { hitTestSectionTitle, hitTestComponentLabel, hitTestFrameTitle }
}
