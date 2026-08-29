import { RotateCcw, X } from 'lucide-react'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import { useI18n } from '@openweave/react'
import type { PrototypeReaction, PrototypeTransition, SceneNode } from '@openweave/scene-graph'

import { useEditorStore } from '@/app/editor/active-store'
import { openExternalLink } from '@/app/shell/ui'

interface PrototypePlayerProps {
  onClose: () => void
}

interface Hotspot {
  node: SceneNode
  x: number
  y: number
  width: number
  height: number
}

const TRANSITION_ANIMATION: Record<PrototypeTransition, string | null> = {
  INSTANT: null,
  DISSOLVE: 'ow-proto-dissolve',
  SLIDE_FROM_LEFT: 'ow-proto-slide-left',
  SLIDE_FROM_RIGHT: 'ow-proto-slide-right',
  SLIDE_FROM_TOP: 'ow-proto-slide-top',
  SLIDE_FROM_BOTTOM: 'ow-proto-slide-bottom'
}

const PLAYER_KEYFRAMES = `
@keyframes ow-proto-dissolve { from { opacity: 0 } to { opacity: 1 } }
@keyframes ow-proto-slide-left { from { transform: translateX(-100%) } to { transform: translateX(0) } }
@keyframes ow-proto-slide-right { from { transform: translateX(100%) } to { transform: translateX(0) } }
@keyframes ow-proto-slide-top { from { transform: translateY(-100%) } to { transform: translateY(0) } }
@keyframes ow-proto-slide-bottom { from { transform: translateY(100%) } to { transform: translateY(0) } }
`

export default function PrototypePlayer({ onClose }: PrototypePlayerProps) {
  const store = useEditorStore()
  const { panels } = useI18n()

  const startFrameId = useMemo(() => {
    const pageId = store.state.currentPageId
    const topLevel = store.graph.getChildren(pageId).filter((n) => n.visible)
    const flowStart = store.graph.getNode(pageId)?.prototypeStartNodeId
    if (flowStart && topLevel.some((n) => n.id === flowStart)) return flowStart
    const selected = store.selectedNode
    if (selected) {
      let current: SceneNode | undefined = selected
      while (current?.parentId && current.parentId !== pageId) {
        current = store.graph.getNode(current.parentId) ?? undefined
      }
      if (current && topLevel.some((n) => n.id === current?.id)) return current.id
    }
    const withReactions = topLevel.find((n) => n.reactions.length > 0)
    return withReactions?.id ?? topLevel[0]?.id ?? null
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store])

  const [frameId, setFrameId] = useState<string | null>(startFrameId)
  const [previous, setPrevious] = useState<{
    frameId: string
    transition: PrototypeTransition
    duration: number
  } | null>(null)
  const historyRef = useRef<string[]>([])
  const imagesRef = useRef(new Map<string, string>())
  const [, bumpImages] = useState(0)

  const frame = frameId ? store.graph.getNode(frameId) : null

  // Fit the frame into the viewport, leaving room for the top bar.
  const [viewport, setViewport] = useState({ w: window.innerWidth, h: window.innerHeight })
  useEffect(() => {
    const onResize = () => setViewport({ w: window.innerWidth, h: window.innerHeight })
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  const scale = frame
    ? Math.min(1, (viewport.w - 48) / frame.width, (viewport.h - 96) / frame.height)
    : 1

  const renderFrame = useCallback(
    async (id: string) => {
      if (imagesRef.current.has(id)) return
      const bytes = await store.renderExportImage([id], 2, 'PNG')
      if (!bytes) return
      const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: 'image/png' }))
      imagesRef.current.set(id, url)
      bumpImages((n) => n + 1)
    },
    [store]
  )

  useEffect(() => {
    if (frameId) void renderFrame(frameId)
  }, [frameId, renderFrame])

  useEffect(() => {
    const images = imagesRef.current
    return () => {
      for (const url of images.values()) URL.revokeObjectURL(url)
    }
  }, [])

  const navigate = useCallback(
    (destinationId: string, transition: PrototypeTransition, duration: number) => {
      setFrameId((current) => {
        if (!current || current === destinationId) return current
        historyRef.current.push(current)
        if (transition !== 'INSTANT' && duration > 0) {
          setPrevious({ frameId: current, transition, duration })
        }
        return destinationId
      })
    },
    []
  )

  useEffect(() => {
    if (!previous) return
    const timer = setTimeout(() => setPrevious(null), previous.duration)
    return () => clearTimeout(timer)
  }, [previous])

  const runReaction = useCallback(
    (reaction: PrototypeReaction) => {
      if (reaction.action === 'NAVIGATE' && reaction.destinationId) {
        if (store.graph.getNode(reaction.destinationId)) {
          navigate(reaction.destinationId, reaction.transition, reaction.transitionDuration)
        }
      } else if (reaction.action === 'BACK') {
        const back = historyRef.current.pop()
        if (back) {
          setPrevious(null)
          setFrameId(back)
        }
      } else if (reaction.action === 'OPEN_URL' && reaction.url) {
        void openExternalLink(reaction.url)
      }
    },
    [navigate, store]
  )

  // Frame-level "after delay" reactions.
  useEffect(() => {
    if (!frame) return
    const timeoutReaction = frame.reactions.find((r) => r.trigger === 'AFTER_TIMEOUT')
    if (!timeoutReaction) return
    const timer = setTimeout(() => runReaction(timeoutReaction), timeoutReaction.timeout)
    return () => clearTimeout(timer)
  }, [frame, runReaction])

  // Escape closes the player before the editor's own shortcut handling runs.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
      }
    }
    window.addEventListener('keydown', onKeyDown, { capture: true })
    return () => window.removeEventListener('keydown', onKeyDown, { capture: true })
  }, [onClose])

  const hotspots: Hotspot[] = useMemo(() => {
    if (!frame) return []
    const frameAbs = store.graph.getAbsolutePosition(frame.id)
    const result: Hotspot[] = []
    // A reaction on the frame itself makes the whole frame clickable. Keep it
    // first so child hotspots stack above it in paint order.
    if (frame.reactions.some((r) => r.trigger !== 'AFTER_TIMEOUT')) {
      result.push({ node: frame, x: 0, y: 0, width: frame.width, height: frame.height })
    }
    const stack = [...frame.childIds]
    while (stack.length > 0) {
      const node = store.graph.getNode(stack.pop() as string)
      if (!node || !node.visible) continue
      if (node.reactions.some((r) => r.trigger !== 'AFTER_TIMEOUT')) {
        const abs = store.graph.getAbsolutePosition(node.id)
        result.push({
          node,
          x: abs.x - frameAbs.x,
          y: abs.y - frameAbs.y,
          width: node.width,
          height: node.height
        })
      }
      stack.push(...node.childIds)
    }
    return result
  }, [frame, store])

  function restart() {
    historyRef.current = []
    setPrevious(null)
    setFrameId(startFrameId)
  }

  if (!frame) return null

  const imageUrl = imagesRef.current.get(frame.id)
  const previousUrl = previous ? imagesRef.current.get(previous.frameId) : undefined
  const animation = previous ? TRANSITION_ANIMATION[previous.transition] : null
  const displayW = frame.width * scale
  const displayH = frame.height * scale

  return createPortal(
    <div
      data-test-id="prototype-player"
      className="fixed inset-0 z-[100] flex flex-col bg-black/95"
    >
      <style>{PLAYER_KEYFRAMES}</style>

      <div className="flex h-11 shrink-0 items-center justify-between px-3">
        <span className="truncate text-xs font-medium text-white/80">{frame.name}</span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label={panels.prototypeRestart}
            data-test-id="prototype-player-restart"
            className="rounded p-1.5 text-white/70 hover:bg-white/10 hover:text-white"
            onClick={restart}
          >
            <RotateCcw className="size-4" />
          </button>
          <button
            type="button"
            aria-label={panels.prototypeClose}
            data-test-id="prototype-player-close"
            className="rounded p-1.5 text-white/70 hover:bg-white/10 hover:text-white"
            onClick={onClose}
          >
            <X className="size-4" />
          </button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 items-center justify-center pb-6">
        <div
          className="relative overflow-hidden rounded shadow-2xl"
          style={{ width: displayW, height: displayH }}
        >
          {previousUrl && (
            <img
              src={previousUrl}
              alt=""
              draggable={false}
              className="absolute inset-0 size-full select-none"
            />
          )}
          <div
            key={frame.id}
            className="absolute inset-0"
            style={
              animation && previous
                ? { animation: `${animation} ${previous.duration}ms ease-out both` }
                : undefined
            }
          >
            {imageUrl && (
              <img
                src={imageUrl}
                alt={frame.name}
                draggable={false}
                className="size-full select-none"
              />
            )}
            {hotspots.map((hotspot) => {
              const click = hotspot.node.reactions.find((r) => r.trigger === 'ON_CLICK')
              const hover = hotspot.node.reactions.find((r) => r.trigger === 'ON_HOVER')
              return (
                <div
                  key={hotspot.node.id}
                  data-test-id="prototype-hotspot"
                  role={click ? 'button' : undefined}
                  aria-label={hotspot.node.name}
                  className={click ? 'absolute cursor-pointer' : 'absolute'}
                  style={{
                    left: hotspot.x * scale,
                    top: hotspot.y * scale,
                    width: hotspot.width * scale,
                    height: hotspot.height * scale
                  }}
                  onClick={click ? () => runReaction(click) : undefined}
                  onMouseEnter={hover ? () => runReaction(hover) : undefined}
                />
              )
            })}
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
