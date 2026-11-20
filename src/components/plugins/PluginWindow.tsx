import { useStore } from '@nanostores/react'
import { Puzzle, X } from 'lucide-react'
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useEventListener } from 'usehooks-ts'

import { useI18n } from '@openweave/react'
import type { Vector } from '@openweave/scene-graph'

import { closeRunningPlugin, connectPluginUI, sendFromPluginUI } from '@/app/plugins/host'
import { runningPlugin } from '@/app/plugins/store'
import { pluginUIDocument } from '@/app/plugins/ui-document'

/** Sandbox flags for plugin UIs: scripts, but no same-origin access to the editor. */
const IFRAME_SANDBOX = 'allow-scripts allow-forms allow-popups allow-modals allow-downloads'
const TITLE_BAR_HEIGHT = 32
const EDGE_MARGIN = 16

function hasPluginMessage(data: unknown): data is { pluginMessage: unknown } {
  return typeof data === 'object' && data !== null && 'pluginMessage' in data
}

/**
 * The running plugin's UI (`figma.showUI`) in a draggable window, or a small
 * "running" pill when the plugin has no visible UI. Lives outside the per-tab
 * editor layout so switching tabs doesn't reload the plugin's UI.
 */
export default function PluginWindow() {
  const running = useStore(runningPlugin)
  const { dialogs } = useI18n()
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const disconnectRef = useRef<(() => void) | null>(null)
  const dragRef = useRef<{ start: Vector; origin: Vector } | null>(null)
  const [offset, setOffset] = useState<Vector>({ x: 0, y: 0 })

  const ui = running?.ui ?? null
  const runId = running?.runId ?? 0
  const srcDoc = useMemo(
    () => (ui ? pluginUIDocument(ui.html, ui.allowedDomains) : ''),
    [ui?.html, ui?.allowedDomains]
  )

  // New run: reset the window position.
  useEffect(() => setOffset({ x: 0, y: 0 }), [runId])

  // A new document (or run) reloads the iframe; queue messages until it loads.
  useEffect(() => {
    return () => {
      disconnectRef.current?.()
      disconnectRef.current = null
    }
  }, [runId, srcDoc])

  // Only this window's iframe may talk to the plugin code.
  useEventListener('message', (event: MessageEvent) => {
    if (!runId || event.source !== iframeRef.current?.contentWindow) return
    if (hasPluginMessage(event.data)) sendFromPluginUI(runId, event.data.pluginMessage)
  })

  if (!running) return null

  const onLoad = () => {
    disconnectRef.current?.()
    const pluginId = running.pluginId
    disconnectRef.current = connectPluginUI(runId, (message) => {
      iframeRef.current?.contentWindow?.postMessage({ pluginMessage: message, pluginId }, '*')
    })
  }

  const startDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId)
    dragRef.current = { start: { x: event.clientX, y: event.clientY }, origin: offset }
  }
  const drag = (event: React.PointerEvent<HTMLDivElement>) => {
    const state = dragRef.current
    if (!state) return
    setOffset({
      x: state.origin.x + event.clientX - state.start.x,
      y: state.origin.y + event.clientY - state.start.y
    })
  }
  const endDrag = () => {
    dragRef.current = null
  }

  const visible = Boolean(ui?.visible)

  return (
    <>
      {ui && (
        <div
          role="dialog"
          aria-label={ui.title}
          data-test-id="plugin-window"
          data-visible={visible || undefined}
          className="fixed z-40 hidden flex-col overflow-hidden rounded-lg border border-border bg-panel shadow-2xl data-[visible]:flex"
          style={{
            top: 56 + offset.y,
            right: EDGE_MARGIN - offset.x,
            width: ui.width,
            height: ui.height + TITLE_BAR_HEIGHT
          }}
        >
          <div
            className="flex shrink-0 cursor-grab items-center gap-2 border-b border-border px-2 select-none active:cursor-grabbing"
            style={{ height: TITLE_BAR_HEIGHT }}
            onPointerDown={startDrag}
            onPointerMove={drag}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
          >
            <Puzzle className="size-3.5 text-muted" />
            <span className="min-w-0 flex-1 truncate text-xs font-medium text-surface">
              {ui.title}
            </span>
            <button
              type="button"
              aria-label={dialogs.stopPlugin}
              data-test-id="plugin-window-close"
              className="flex size-6 cursor-pointer items-center justify-center rounded text-muted hover:bg-hover hover:text-surface"
              onPointerDown={(event) => event.stopPropagation()}
              onClick={closeRunningPlugin}
            >
              <X className="size-3.5" />
            </button>
          </div>
          <iframe
            key={runId}
            ref={iframeRef}
            aria-label={ui.title}
            sandbox={IFRAME_SANDBOX}
            srcDoc={srcDoc}
            onLoad={onLoad}
            className="min-h-0 flex-1 border-0 bg-white"
          />
        </div>
      )}
      {!visible && (
        <div
          data-test-id="plugin-running"
          className="fixed bottom-20 left-1/2 z-40 flex -translate-x-1/2 items-center gap-2 rounded-full border border-border bg-panel px-3 py-1.5 text-xs text-surface shadow-lg"
        >
          <Puzzle className="size-3.5 text-muted" />
          {dialogs.pluginRunning({ name: running.name })}
          <button
            type="button"
            className="cursor-pointer rounded px-1.5 text-accent hover:bg-hover"
            onClick={closeRunningPlugin}
          >
            {dialogs.stopPlugin}
          </button>
        </div>
      )}
    </>
  )
}
