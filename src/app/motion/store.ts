import { atom } from 'nanostores'

import { getActiveEditorStore } from '@/app/editor/active-store'
import type {
  AnimatableProperty,
  NodeAnimationTrack,
  PropertyTrack,
  TimelineKeyframe,
  TimelineState
} from '@/app/motion/types'

const DEFAULT_DURATION_MS = 2000
const DEFAULT_TIMELINE_STATE: TimelineState = {
  currentTimeMs: 0,
  durationMs: DEFAULT_DURATION_MS,
  isPlaying: false,
  zoom: 1,
  loop: true
}

export const timelineStore = atom<TimelineState>(DEFAULT_TIMELINE_STATE)
export const nodeTracksStore = atom<Record<string, NodeAnimationTrack>>({})

function generateId(): string {
  const buf = new Uint32Array(2)
  crypto.getRandomValues(buf)
  return `${buf[0]?.toString(16) ?? '0'}${buf[1]?.toString(16) ?? '0'}`
}

export function interpolateProperty(track: PropertyTrack, timeMs: number): number | undefined {
  const keyframes = track.keyframes
  if (keyframes.length === 0) return undefined
  const first = keyframes[0]
  if (keyframes.length === 1 && first) return first.value

  if (first && timeMs <= first.timeMs) return first.value
  const last = keyframes[keyframes.length - 1]
  if (last && timeMs >= last.timeMs) return last.value

  for (let i = 0; i < keyframes.length - 1; i++) {
    const k0 = keyframes[i]
    const k1 = keyframes[i + 1]
    if (k0 && k1 && timeMs >= k0.timeMs && timeMs <= k1.timeMs) {
      const span = k1.timeMs - k0.timeMs
      if (span <= 0) return k1.value
      const t = Math.max(0, Math.min(1, (timeMs - k0.timeMs) / span))
      // Smooth ease in-out by default
      const progress = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2
      return k0.value + (k1.value - k0.value) * progress
    }
  }

  return last?.value
}

function applyMotionToCanvas(timeMs: number): void {
  try {
    const store = getActiveEditorStore()
    const tracks = nodeTracksStore.get()
    let hasChanges = false

    for (const [nodeId, nodeTrack] of Object.entries(tracks)) {
      const node = store.getNode(nodeId)
      if (!node) continue

      const xTrack = nodeTrack.tracks.x
      if (xTrack) {
        const val = interpolateProperty(xTrack, timeMs)
        if (typeof val === 'number') {
          node.x = val
          hasChanges = true
        }
      }

      const yTrack = nodeTrack.tracks.y
      if (yTrack) {
        const val = interpolateProperty(yTrack, timeMs)
        if (typeof val === 'number') {
          node.y = val
          hasChanges = true
        }
      }

      const widthTrack = nodeTrack.tracks.width
      if (widthTrack) {
        const val = interpolateProperty(widthTrack, timeMs)
        if (typeof val === 'number') {
          node.width = val
          hasChanges = true
        }
      }

      const heightTrack = nodeTrack.tracks.height
      if (heightTrack) {
        const val = interpolateProperty(heightTrack, timeMs)
        if (typeof val === 'number') {
          node.height = val
          hasChanges = true
        }
      }

      const rotationTrack = nodeTrack.tracks.rotation
      if (rotationTrack) {
        const val = interpolateProperty(rotationTrack, timeMs)
        if (typeof val === 'number') {
          node.rotation = val
          hasChanges = true
        }
      }

      const opacityTrack = nodeTrack.tracks.opacity
      if (opacityTrack) {
        const val = interpolateProperty(opacityTrack, timeMs)
        if (typeof val === 'number') {
          node.opacity = val
          hasChanges = true
        }
      }
    }

    if (hasChanges) {
      store.requestRepaint()
    }
  } catch {
    // Editor store may be unavailable in tests or headless runs
  }
}

let animFrameId: number | null = null
let lastRafTime: number | null = null

function tick(timestamp: number): void {
  const current = timelineStore.get()
  if (!current.isPlaying) {
    lastRafTime = null
    return
  }

  if (lastRafTime === null) {
    lastRafTime = timestamp
  }

  const delta = timestamp - lastRafTime
  lastRafTime = timestamp

  let nextTime = current.currentTimeMs + delta
  if (nextTime > current.durationMs) {
    if (current.loop) {
      nextTime = nextTime % current.durationMs
    } else {
      nextTime = current.durationMs
      pause()
      seek(nextTime)
      return
    }
  }

  timelineStore.set({
    ...current,
    currentTimeMs: nextTime
  })
  applyMotionToCanvas(nextTime)

  animFrameId = requestAnimationFrame(tick)
}

export function play(): void {
  const current = timelineStore.get()
  if (current.isPlaying) return

  // If at the end, restart from beginning
  let startMs = current.currentTimeMs
  if (startMs >= current.durationMs) {
    startMs = 0
  }

  timelineStore.set({
    ...current,
    currentTimeMs: startMs,
    isPlaying: true
  })
  lastRafTime = null
  animFrameId = requestAnimationFrame(tick)
}

export function pause(): void {
  const current = timelineStore.get()
  if (!current.isPlaying) return

  if (animFrameId !== null) {
    cancelAnimationFrame(animFrameId)
    animFrameId = null
  }
  lastRafTime = null

  timelineStore.set({
    ...current,
    isPlaying: false
  })
}

export function togglePlay(): void {
  const current = timelineStore.get()
  if (current.isPlaying) {
    pause()
  } else {
    play()
  }
}

export function seek(timeMs: number): void {
  const current = timelineStore.get()
  const clamped = Math.max(0, Math.min(current.durationMs, Math.round(timeMs)))
  timelineStore.set({
    ...current,
    currentTimeMs: clamped
  })
  applyMotionToCanvas(clamped)
}

export function setDuration(durationMs: number): void {
  const current = timelineStore.get()
  const clampedDuration = Math.max(100, Math.round(durationMs))
  const clampedCurrent = Math.min(current.currentTimeMs, clampedDuration)
  timelineStore.set({
    ...current,
    durationMs: clampedDuration,
    currentTimeMs: clampedCurrent
  })
}

export function setZoom(zoom: number): void {
  const current = timelineStore.get()
  const clamped = Math.max(0.2, Math.min(5, zoom))
  timelineStore.set({
    ...current,
    zoom: clamped
  })
}

export function setLoop(loop: boolean): void {
  const current = timelineStore.get()
  timelineStore.set({
    ...current,
    loop
  })
}

export function addKeyframe(
  nodeId: string,
  nodeName: string,
  property: AnimatableProperty,
  value: number,
  timeMs?: number,
  easing = 'ease-in-out'
): TimelineKeyframe {
  const targetTime = timeMs ?? timelineStore.get().currentTimeMs
  const allTracks = { ...nodeTracksStore.get() }
  const existingNodeTrack = allTracks[nodeId] ?? {
    nodeId,
    nodeName,
    tracks: {}
  }

  const existingPropTrack = existingNodeTrack.tracks[property] ?? {
    property,
    keyframes: []
  }

  const keyframes = [...existingPropTrack.keyframes]
  const existingIndex = keyframes.findIndex((kf) => Math.abs(kf.timeMs - targetTime) <= 5)

  let resultKeyframe: TimelineKeyframe

  if (existingIndex !== -1 && keyframes[existingIndex]) {
    resultKeyframe = {
      ...keyframes[existingIndex],
      value,
      easing
    }
    keyframes[existingIndex] = resultKeyframe
  } else {
    resultKeyframe = {
      id: generateId(),
      timeMs: targetTime,
      value,
      easing
    }
    keyframes.push(resultKeyframe)
    keyframes.sort((a, b) => a.timeMs - b.timeMs)
  }

  allTracks[nodeId] = {
    ...existingNodeTrack,
    nodeName,
    tracks: {
      ...existingNodeTrack.tracks,
      [property]: {
        property,
        keyframes
      }
    }
  }

  nodeTracksStore.set(allTracks)
  return resultKeyframe
}

export function removeKeyframe(
  nodeId: string,
  property: AnimatableProperty,
  keyframeId: string
): void {
  const allTracks = { ...nodeTracksStore.get() }
  const nodeTrack = allTracks[nodeId]
  if (!nodeTrack) return

  const propTrack = nodeTrack.tracks[property]
  if (!propTrack) return

  const updatedKeyframes = propTrack.keyframes.filter((kf) => kf.id !== keyframeId)
  if (updatedKeyframes.length === 0) {
    const updatedSubTracks = Object.fromEntries(
      Object.entries(nodeTrack.tracks).filter(([k]) => k !== property)
    ) as Partial<Record<AnimatableProperty, PropertyTrack>>

    if (Object.keys(updatedSubTracks).length === 0) {
      const remainingTracks = Object.fromEntries(
        Object.entries(allTracks).filter(([k]) => k !== nodeId)
      )
      nodeTracksStore.set(remainingTracks)
      return
    }

    allTracks[nodeId] = {
      ...nodeTrack,
      tracks: updatedSubTracks
    }
  } else {
    allTracks[nodeId] = {
      ...nodeTrack,
      tracks: {
        ...nodeTrack.tracks,
        [property]: {
          property,
          keyframes: updatedKeyframes
        }
      }
    }
  }

  nodeTracksStore.set(allTracks)
}

export function hasKeyframeAt(
  nodeId: string,
  property: AnimatableProperty,
  timeMs: number,
  toleranceMs = 20
): boolean {
  const nodeTrack = nodeTracksStore.get()[nodeId]
  if (!nodeTrack) return false
  const propTrack = nodeTrack.tracks[property]
  if (!propTrack) return false
  return propTrack.keyframes.some((kf) => Math.abs(kf.timeMs - timeMs) <= toleranceMs)
}

export function getKeyframeAt(
  nodeId: string,
  property: AnimatableProperty,
  timeMs: number,
  toleranceMs = 20
): TimelineKeyframe | undefined {
  const nodeTrack = nodeTracksStore.get()[nodeId]
  if (!nodeTrack) return undefined
  const propTrack = nodeTrack.tracks[property]
  if (!propTrack) return undefined
  return propTrack.keyframes.find((kf) => Math.abs(kf.timeMs - timeMs) <= toleranceMs)
}

export function clearAllTracks(): void {
  pause()
  timelineStore.set(DEFAULT_TIMELINE_STATE)
  nodeTracksStore.set({})
}
