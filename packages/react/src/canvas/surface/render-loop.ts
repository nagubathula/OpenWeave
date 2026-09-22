import { getEditorFrameScheduler } from '#react/internal/frame-scheduler'

import type { Editor } from '@openweave/core/editor'

import type { CanvasRenderLayer } from './types'

type RenderLoopOptions = {
  layer?: CanvasRenderLayer
}

function shouldScheduleForSelection(layer: CanvasRenderLayer | undefined) {
  return layer !== 'scene'
}

export function createCanvasRenderLoop(
  editor: Editor,
  renderNow: () => void,
  options: RenderLoopOptions = {}
) {
  const scheduler = getEditorFrameScheduler(editor)
  let dirty = true
  let frameScheduled = false
  let lastRenderVersion = -1
  let lastSelectedIds: Set<string> | null = null
  let animFrameId: number | null = null

  function checkShaderAnimation() {
    if (typeof requestAnimationFrame === 'undefined') return
    const renderers = editor.canvasRenderers ?? []
    const hasShaders = renderers.some((r) => r.hasActiveShaders(editor.graph))
    if (hasShaders && animFrameId === null) {
      animFrameId = requestAnimationFrame(tickShaderAnimation)
    } else if (!hasShaders && animFrameId !== null) {
      cancelAnimationFrame(animFrameId)
      animFrameId = null
    }
  }

  function tickShaderAnimation(nowMs: number) {
    animFrameId = null
    const renderers = editor.canvasRenderers ?? []
    const hasShaders = renderers.some((r) => r.hasActiveShaders(editor.graph))
    if (!hasShaders) return

    for (const r of renderers) {
      r.shaderTime = nowMs / 1000
    }
    dirty = true
    renderFrame()
    animFrameId = requestAnimationFrame(tickShaderAnimation)
  }

  function renderFrame() {
    frameScheduled = false
    if (editor.state.loading) {
      scheduleRender()
      return
    }

    const versionChanged = editor.state.renderVersion !== lastRenderVersion
    const selectionChanged = editor.state.selectedIds !== lastSelectedIds
    if (dirty || versionChanged || selectionChanged) {
      dirty = false
      renderNow()
      checkShaderAnimation()
    }
  }

  const scheduleRender = () => {
    dirty = true
    if (frameScheduled) return
    frameScheduled = true
    scheduler.scheduleRender(renderFrame)
  }

  const unsubscribe = [
    editor.onEditorEvent('render:requested', scheduleRender),
    editor.onEditorEvent('viewport:changed', scheduleRender)
  ]

  unsubscribe.push(editor.onEditorEvent('repaint:requested', scheduleRender))
  unsubscribe.push(editor.onEditorEvent('page:changed', checkShaderAnimation))

  if (shouldScheduleForSelection(options.layer)) {
    unsubscribe.push(editor.onEditorEvent('selection:changed', scheduleRender))
  }

  function markRendered() {
    lastRenderVersion = editor.state.renderVersion
    lastSelectedIds = editor.state.selectedIds
  }

  function pause() {
    for (const off of unsubscribe) off()
    if (frameScheduled) {
      scheduler.cancelRender(renderFrame)
      frameScheduled = false
    }
    if (animFrameId !== null) {
      cancelAnimationFrame(animFrameId)
      animFrameId = null
    }
  }

  return {
    pause,
    markRendered,
    markDirty: scheduleRender
  }
}
