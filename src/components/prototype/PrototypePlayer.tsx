import { RotateCcw, X } from 'lucide-react'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import { colorToCSS } from '@openweave/core/color'
import {
  getSpringCssEasing,
  matchLayers,
  PrototypeEvaluator,
  PROTOTYPE_EASING_CSS
} from '@openweave/core/editor'
import type { LayerMatch, SmartAnimatePlan } from '@openweave/core/editor'
import { useI18n } from '@openweave/react'
import type {
  PrototypeEasing,
  PrototypeReaction,
  PrototypeTransition,
  SceneNode,
  SpringConfig,
  SpringPreset,
  VariableValue
} from '@openweave/scene-graph'

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

const INCOMING_ANIMATION: Record<PrototypeTransition, string | null> = {
  INSTANT: null,
  DISSOLVE: 'ow-proto-dissolve',
  SMART_ANIMATE: 'ow-proto-dissolve',
  SLIDE_FROM_LEFT: 'ow-proto-slide-left',
  SLIDE_FROM_RIGHT: 'ow-proto-slide-right',
  SLIDE_FROM_TOP: 'ow-proto-slide-top',
  SLIDE_FROM_BOTTOM: 'ow-proto-slide-bottom',
  PUSH_LEFT: 'ow-proto-slide-right',
  PUSH_RIGHT: 'ow-proto-slide-left',
  PUSH_TOP: 'ow-proto-slide-bottom',
  PUSH_BOTTOM: 'ow-proto-slide-top',
  MOVE_IN_LEFT: 'ow-proto-slide-left',
  MOVE_IN_RIGHT: 'ow-proto-slide-right',
  MOVE_IN_TOP: 'ow-proto-slide-top',
  MOVE_IN_BOTTOM: 'ow-proto-slide-bottom',
  MOVE_OUT_LEFT: null,
  MOVE_OUT_RIGHT: null,
  MOVE_OUT_TOP: null,
  MOVE_OUT_BOTTOM: null
}

const OUTGOING_ANIMATION: Record<PrototypeTransition, string | null> = {
  INSTANT: null,
  DISSOLVE: 'ow-proto-fade-out',
  SMART_ANIMATE: 'ow-proto-fade-out',
  SLIDE_FROM_LEFT: null,
  SLIDE_FROM_RIGHT: null,
  SLIDE_FROM_TOP: null,
  SLIDE_FROM_BOTTOM: null,
  PUSH_LEFT: 'ow-proto-slide-out-left',
  PUSH_RIGHT: 'ow-proto-slide-out-right',
  PUSH_TOP: 'ow-proto-slide-out-top',
  PUSH_BOTTOM: 'ow-proto-slide-out-bottom',
  MOVE_IN_LEFT: null,
  MOVE_IN_RIGHT: null,
  MOVE_IN_TOP: null,
  MOVE_IN_BOTTOM: null,
  MOVE_OUT_LEFT: 'ow-proto-slide-out-left',
  MOVE_OUT_RIGHT: 'ow-proto-slide-out-right',
  MOVE_OUT_TOP: 'ow-proto-slide-out-top',
  MOVE_OUT_BOTTOM: 'ow-proto-slide-out-bottom'
}

function frameImageKey(
  frameId: string,
  overrides: ReadonlyMap<string, string>,
  varOverrides: ReadonlyMap<string, unknown>
): string {
  if (overrides.size === 0 && varOverrides.size === 0) return frameId
  const parts = [...overrides.entries()].map(([a, b]) => `${a}=${b}`).sort()
  const varParts = [...varOverrides.entries()].map(([a, b]) => `${a}=${JSON.stringify(b)}`).sort()
  return `${frameId}|${parts.join(',')}|${varParts.join(',')}`
}

const PLAYER_KEYFRAMES = `
@keyframes ow-proto-dissolve { from { opacity: 0 } to { opacity: 1 } }
@keyframes ow-proto-fade-out { from { opacity: 1 } to { opacity: 0 } }
@keyframes ow-proto-smart-fade { from { opacity: 0.1 } to { opacity: 1 } }
@keyframes ow-proto-slide-left { from { transform: translateX(-100%) } to { transform: translateX(0) } }
@keyframes ow-proto-slide-right { from { transform: translateX(100%) } to { transform: translateX(0) } }
@keyframes ow-proto-slide-top { from { transform: translateY(-100%) } to { transform: translateY(0) } }
@keyframes ow-proto-slide-bottom { from { transform: translateY(100%) } to { transform: translateY(0) } }
@keyframes ow-proto-slide-out-left { from { transform: translateX(0) } to { transform: translateX(-100%) } }
@keyframes ow-proto-slide-out-right { from { transform: translateX(0) } to { transform: translateX(100%) } }
@keyframes ow-proto-slide-out-top { from { transform: translateY(0) } to { transform: translateY(-100%) } }
@keyframes ow-proto-slide-out-bottom { from { transform: translateY(0) } to { transform: translateY(100%) } }
`

function SmartAnimateLayer({
  match,
  scale,
  duration,
  easingCss,
  store
}: {
  match: LayerMatch
  scale: number
  duration: number
  easingCss: string
  store: ReturnType<typeof useEditorStore>
}) {
  const [animating, setAnimating] = useState(false)
  const destNode = store.graph.getNode(match.destination.id)

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setAnimating(true)
    })
    return () => cancelAnimationFrame(frame)
  }, [])

  const srcX = match.source.x * scale
  const srcY = match.source.y * scale
  const srcW = match.source.width * scale
  const srcH = match.source.height * scale
  const srcRot = match.source.rotation ?? 0
  const srcRadius = (match.source.cornerRadius ?? 0) * scale
  const srcOpacity = match.source.opacity ?? 1

  const destX = match.destination.x * scale
  const destY = match.destination.y * scale
  const destW = match.destination.width * scale
  const destH = match.destination.height * scale
  const destRot = match.destination.rotation ?? 0
  const destRadius = (match.destination.cornerRadius ?? 0) * scale
  const destOpacity = match.destination.opacity ?? 1

  const fill = destNode?.fills?.[0]
  const bgColor =
    fill?.type === 'SOLID' && fill.color
      ? colorToCSS({ ...fill.color, a: fill.opacity ?? 1 })
      : undefined

  const stroke = destNode?.strokes?.[0]
  const borderColor =
    stroke?.visible !== false && stroke?.color
      ? colorToCSS({ ...stroke.color, a: stroke.opacity ?? 1 })
      : undefined
  const borderWidth = stroke?.visible !== false && stroke?.weight ? stroke.weight * scale : 0

  const textContent = destNode?.type === 'TEXT' ? destNode.text : null
  const textColor = destNode?.fills?.[0]?.color ? colorToCSS(destNode.fills[0].color) : '#fff'

  return (
    <div
      className="pointer-events-none absolute select-none flex items-center justify-center overflow-hidden"
      style={{
        left: animating ? destX : srcX,
        top: animating ? destY : srcY,
        width: animating ? destW : srcW,
        height: animating ? destH : srcH,
        borderRadius: animating ? destRadius : srcRadius,
        opacity: animating ? destOpacity : srcOpacity,
        transform: `rotate(${animating ? destRot : srcRot}deg)`,
        backgroundColor: bgColor,
        borderColor: borderColor,
        borderWidth: borderWidth ? `${borderWidth}px` : undefined,
        borderStyle: borderWidth ? 'solid' : undefined,
        transition: `all ${duration}ms ${easingCss}`,
        zIndex: 20
      }}
    >
      {textContent && (
        <span
          className="truncate px-1"
          style={{
            fontSize: `${(destNode?.fontSize ?? 14) * scale}px`,
            color: textColor
          }}
        >
          {textContent}
        </span>
      )}
    </div>
  )
}

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
  const [overlays, setOverlays] = useState<Array<{ frameId: string; reaction: PrototypeReaction }>>(
    []
  )

  const [previous, setPrevious] = useState<{
    frameId: string
    transition: PrototypeTransition
    duration: number
    easing?: PrototypeEasing
    springPreset?: SpringPreset
    springConfig?: SpringConfig
    smartAnimatePlan?: SmartAnimatePlan
  } | null>(null)
  // Interactive components: player-local variant state (instance id →
  // variant component id), applied only while rendering the frame image.
  const [variantOverrides, setVariantOverrides] = useState<ReadonlyMap<string, string>>(
    () => new Map()
  )
  const [variableOverrides, setVariableOverrides] = useState<ReadonlyMap<string, unknown>>(() => {
    // Initialize with default values from the document
    const vars = new Map<string, unknown>()
    for (const variable of store.graph.variables.values()) {
      const modeId = store.graph.activeMode.get(variable.collectionId)
      const val = variable.valuesByMode[modeId ?? ''] ?? Object.values(variable.valuesByMode)[0]
      vars.set(variable.id, val)
    }
    return vars
  })

  const historyRef = useRef<
    Array<{
      frameId: string
      overlays: Array<{ frameId: string; reaction: PrototypeReaction }>
      variableOverrides: ReadonlyMap<string, unknown>
    }>
  >([])
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
    async (
      id: string,
      overrides: ReadonlyMap<string, string>,
      varOverrides: ReadonlyMap<string, unknown>
    ) => {
      const key = frameImageKey(id, overrides, varOverrides)
      if (imagesRef.current.has(key)) return

      // Interactive-component states render by swapping the instances'
      // variants for the duration of the export render, then swapping back —
      // net-zero document change, no undo entries (graph-level ops).
      const restores: Array<[string, string]> = []
      for (const [instanceId, componentId] of overrides) {
        const instance = store.graph.getNode(instanceId)
        const component = store.graph.getNode(componentId)
        if (
          instance?.type === 'INSTANCE' &&
          instance.componentId &&
          instance.componentId !== componentId &&
          component?.type === 'COMPONENT'
        ) {
          restores.push([instanceId, instance.componentId])
          store.graph.swapInstanceComponent(instanceId, componentId)
        }
      }

      // Temporarily override variable values
      const varRestores: Array<[string, unknown, string]> = []
      for (const [varId, val] of varOverrides) {
        const variable = store.graph.variables.get(varId)
        if (variable) {
          const modeId =
            store.graph.activeMode.get(variable.collectionId) ??
            Object.keys(variable.valuesByMode)[0]
          varRestores.push([varId, variable.valuesByMode[modeId], modeId])
          variable.valuesByMode[modeId] = val as VariableValue
        }
      }

      let bytes: Uint8Array | null = null
      try {
        bytes = await store.renderExportImage([id], 2, 'PNG')
      } finally {
        for (const [instanceId, prevComponentId] of restores.reverse()) {
          store.graph.swapInstanceComponent(instanceId, prevComponentId)
        }
        for (const [varId, oldVal, modeId] of varRestores.reverse()) {
          const variable = store.graph.variables.get(varId)
          if (variable) variable.valuesByMode[modeId] = oldVal as VariableValue
        }
      }
      if (!bytes) return
      const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: 'image/png' }))
      imagesRef.current.set(key, url)
      bumpImages((n) => n + 1)
    },
    [store]
  )

  useEffect(() => {
    if (frameId) void renderFrame(frameId, variantOverrides, variableOverrides)
    for (const overlay of overlays) {
      void renderFrame(overlay.frameId, variantOverrides, variableOverrides)
    }
  }, [frameId, overlays, variantOverrides, variableOverrides, renderFrame])

  useEffect(() => {
    const images = imagesRef.current
    return () => {
      for (const url of images.values()) URL.revokeObjectURL(url)
    }
  }, [])

  const navigate = useCallback(
    (
      destinationId: string,
      transition: PrototypeTransition,
      duration: number,
      easing: PrototypeEasing = 'EASE_OUT',
      springPreset?: SpringPreset,
      springConfig?: SpringConfig
    ) => {
      setFrameId((current) => {
        if (!current || current === destinationId) return current
        historyRef.current.push({ frameId: current, overlays, variableOverrides })
        if (transition !== 'INSTANT' && duration > 0) {
          const plan =
            transition === 'SMART_ANIMATE'
              ? matchLayers(store.graph, current, destinationId)
              : undefined
          setPrevious({
            frameId: current,
            transition,
            duration,
            easing,
            springPreset,
            springConfig,
            smartAnimatePlan: plan
          })
        }
        setVariantOverrides(new Map())
        setOverlays([])
        return destinationId
      })
    },
    [overlays, variableOverrides, store.graph]
  )

  const setVariantState = useCallback((instanceId: string, componentId: string | null) => {
    setVariantOverrides((current) => {
      const next = new Map(current)
      if (componentId) next.set(instanceId, componentId)
      else next.delete(instanceId)
      return next
    })
  }, [])

  useEffect(() => {
    if (!previous) return
    const timer = setTimeout(() => setPrevious(null), previous.duration)
    return () => clearTimeout(timer)
  }, [previous])

  const evaluator = useMemo(() => {
    return new PrototypeEvaluator(
      new Map(variableOverrides as Map<string, VariableValue>),
      (id) => store.graph.variables.get(id)?.name
    )
  }, [variableOverrides, store.graph.variables])

  const runReaction = useCallback(
    (reaction: PrototypeReaction, nodeId?: string) => {
      if (reaction.action === 'CONDITIONAL') {
        const result = evaluator.evaluate(reaction.conditionExpression ?? 'false')
        if (result) {
          reaction.conditionalActions?.forEach((a) => runReaction(a, nodeId))
        } else {
          reaction.fallbackActions?.forEach((a) => runReaction(a, nodeId))
        }
        return
      }

      if (
        reaction.action === 'SET_VARIABLE' &&
        reaction.variableId &&
        reaction.variableExpression
      ) {
        const newVal = evaluator.evaluate(reaction.variableExpression)
        if (newVal !== undefined) {
          setVariableOverrides((current) => {
            const next = new Map(current)
            next.set(reaction.variableId ?? '', newVal)
            return next
          })
        }
        return
      }

      if (reaction.action === 'NAVIGATE' && reaction.destinationId) {
        if (store.graph.getNode(reaction.destinationId)) {
          navigate(
            reaction.destinationId,
            reaction.transition,
            reaction.transitionDuration,
            reaction.easing,
            reaction.springPreset,
            reaction.springConfig
          )
        }
      } else if (reaction.action === 'OPEN_OVERLAY' && reaction.destinationId) {
        setOverlays((current) => [...current, { frameId: reaction.destinationId ?? '', reaction }])
      } else if (reaction.action === 'SWAP_OVERLAY' && reaction.destinationId) {
        setOverlays((current) => {
          if (current.length === 0) return current
          const next = [...current]
          next[next.length - 1] = { frameId: reaction.destinationId!, reaction }
          return next
        })
      } else if (reaction.action === 'CLOSE_OVERLAY') {
        setOverlays((current) => current.slice(0, -1))
      } else if (reaction.action === 'BACK') {
        const back = historyRef.current.pop()
        if (back) {
          setPrevious(null)
          setVariantOverrides(new Map())
          setVariableOverrides(back.variableOverrides)
          setOverlays(back.overlays)
          setFrameId(back.frameId)
        }
      } else if (reaction.action === 'OPEN_URL' && reaction.url) {
        void openExternalLink(reaction.url)
      } else if (reaction.action === 'CHANGE_TO' && reaction.destinationId && nodeId) {
        setVariantState(nodeId, reaction.destinationId)
      }
    },
    [navigate, setVariantState, store, evaluator]
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
    setVariantOverrides(new Map())
    setFrameId(startFrameId)
  }

  if (!frame) return null

  const imageUrl = imagesRef.current.get(
    frameImageKey(frame.id, variantOverrides, variableOverrides)
  )
  const previousUrl = previous
    ? imagesRef.current.get(frameImageKey(previous.frameId, new Map(), new Map()))
    : undefined
  const incomingAnimation = previous ? INCOMING_ANIMATION[previous.transition] : null
  const outgoingAnimation = previous ? OUTGOING_ANIMATION[previous.transition] : null
  const easingCss = previous
    ? previous.easing === 'SPRING'
      ? getSpringCssEasing(previous.springPreset, previous.springConfig)
      : (PROTOTYPE_EASING_CSS[previous.easing ?? 'EASE_OUT'] ?? 'ease-out')
    : 'ease-out'
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
            <div
              className={`absolute inset-0 ${previous?.transition.startsWith('MOVE_OUT') ? 'z-10' : 'z-0'}`}
              style={
                outgoingAnimation && previous
                  ? { animation: `${outgoingAnimation} ${previous.duration}ms ${easingCss} both` }
                  : undefined
              }
            >
              <img src={previousUrl} alt="" draggable={false} className="size-full select-none" />
            </div>
          )}
          {previous?.transition === 'SMART_ANIMATE' &&
            previous.smartAnimatePlan?.matches.map((match) => (
              <SmartAnimateLayer
                key={`smart-${match.source.id}-${match.destination.id}`}
                match={match}
                scale={scale}
                duration={previous.duration}
                easingCss={easingCss}
                store={store}
              />
            ))}
          <div
            key={frame.id}
            className={`absolute inset-0 ${previous?.transition.startsWith('MOVE_OUT') ? 'z-0' : 'z-1'}`}
            style={
              incomingAnimation && previous
                ? { animation: `${incomingAnimation} ${previous.duration}ms ${easingCss} both` }
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
              const hoverReverts = hover?.action === 'CHANGE_TO'
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
                  onClick={click ? () => runReaction(click, hotspot.node.id) : undefined}
                  onMouseEnter={hover ? () => runReaction(hover, hotspot.node.id) : undefined}
                  onMouseLeave={
                    hoverReverts ? () => setVariantState(hotspot.node.id, null) : undefined
                  }
                />
              )
            })}
          </div>

          {/* Overlays */}
          {overlays.map((overlay, index) => {
            const overlayNode = store.graph.getNode(overlay.frameId)
            if (!overlayNode) return null

            const overlayImageUrl = imagesRef.current.get(
              frameImageKey(overlay.frameId, variantOverrides, variableOverrides)
            )
            if (!overlayImageUrl) return null

            // Simple positioning implementation (Centered)
            const oWidth = overlayNode.width * scale
            const oHeight = overlayNode.height * scale
            let left = (displayW - oWidth) / 2
            let top = (displayH - oHeight) / 2

            // Handle basic pos overrides
            if (overlay.reaction.overlayPosition === 'TOP_LEFT') {
              left = 0
              top = 0
            } else if (overlay.reaction.overlayPosition === 'TOP_RIGHT') {
              left = displayW - oWidth
              top = 0
            } else if (overlay.reaction.overlayPosition === 'BOTTOM_LEFT') {
              left = 0
              top = displayH - oHeight
            } else if (overlay.reaction.overlayPosition === 'BOTTOM_RIGHT') {
              left = displayW - oWidth
              top = displayH - oHeight
            } else if (overlay.reaction.overlayPosition === 'TOP_CENTER') {
              top = 0
            } else if (overlay.reaction.overlayPosition === 'BOTTOM_CENTER') {
              top = displayH - oHeight
            }

            return (
              <div
                key={`${overlay.frameId}-${index}`}
                className="absolute inset-0 z-10 pointer-events-none"
              >
                {overlay.reaction.overlayBackgroundScrim && (
                  <div
                    className="absolute inset-0 bg-black/25 pointer-events-auto"
                    onClick={
                      overlay.reaction.overlayCloseOnClickOutside
                        ? () =>
                            setOverlays((current) =>
                              current.filter((o) => o.frameId !== overlay.frameId)
                            )
                        : undefined
                    }
                  />
                )}
                {!overlay.reaction.overlayBackgroundScrim &&
                  overlay.reaction.overlayCloseOnClickOutside && (
                    <div
                      className="absolute inset-0 pointer-events-auto"
                      onClick={() =>
                        setOverlays((current) =>
                          current.filter((o) => o.frameId !== overlay.frameId)
                        )
                      }
                    />
                  )}
                <div
                  className="absolute pointer-events-auto shadow-2xl"
                  style={{ left, top, width: oWidth, height: oHeight }}
                >
                  <img
                    src={overlayImageUrl}
                    alt={overlayNode.name}
                    draggable={false}
                    className="size-full select-none"
                  />
                  {/* Basic overlay click-to-close handler on the overlay itself if it has a reaction */}
                  {overlayNode.reactions.some((r) => r.action === 'CLOSE_OVERLAY') && (
                    <div
                      className="absolute inset-0 cursor-pointer"
                      onClick={() =>
                        setOverlays((current) =>
                          current.filter((o) => o.frameId !== overlay.frameId)
                        )
                      }
                    />
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>,
    document.body
  )
}
