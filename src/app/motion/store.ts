import { atom } from 'nanostores'

import { getActiveEditorStore } from '@/app/editor/active-store'
import type {
  AnimatableProperty,
  KeyframeEasing,
  MotionPreset,
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
  loop: true,
  playbackSpeed: 1,
  timeFormat: 'ms',
  isRecording: false
}

export const timelineStore = atom<TimelineState>(DEFAULT_TIMELINE_STATE)
export const nodeTracksStore = atom<Record<string, NodeAnimationTrack>>({})

function generateId(): string {
  const buf = new Uint32Array(2)
  crypto.getRandomValues(buf)
  return `${buf[0]?.toString(16) ?? '0'}${buf[1]?.toString(16) ?? '0'}`
}

export function evaluateEasing(progress: number, easing: KeyframeEasing = 'ease-in-out'): number {
  const t = Math.max(0, Math.min(1, progress))
  switch (easing) {
    case 'linear':
      return t
    case 'ease-in':
      return t * t * t
    case 'ease-out':
      return 1 - (1 - t) ** 3
    case 'ease-in-out':
      return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2
    case 'spring':
      // Damped harmonic oscillator with subtle overshoot
      return 1 - Math.cos(t * Math.PI * 2.5) * Math.exp(-t * 3)
    default:
      return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2
  }
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
      const t = (timeMs - k0.timeMs) / span
      const progress = evaluateEasing(t, k0.easing)
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

      const changes: Record<string, number> = {}

      for (const [propKey, propTrack] of Object.entries(nodeTrack.tracks) as [
        AnimatableProperty,
        PropertyTrack | undefined
      ][]) {
        if (!propTrack) continue
        const val = interpolateProperty(propTrack, timeMs)
        if (typeof val === 'number') {
          changes[propKey] = val
        }
      }

      if (Object.keys(changes).length > 0) {
        store.updateNode(nodeId, changes)
        hasChanges = true
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

  const speed = current.playbackSpeed ?? 1
  const delta = (timestamp - lastRafTime) * speed
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

export function setPlaybackSpeed(speed: number): void {
  const current = timelineStore.get()
  const clamped = Math.max(0.1, Math.min(5, speed))
  timelineStore.set({
    ...current,
    playbackSpeed: clamped
  })
}

export function setTimeFormat(format: 'ms' | 'frames'): void {
  const current = timelineStore.get()
  timelineStore.set({
    ...current,
    timeFormat: format
  })
}

export function toggleRecording(enabled?: boolean): void {
  const current = timelineStore.get()
  timelineStore.set({
    ...current,
    isRecording: enabled !== undefined ? enabled : !current.isRecording
  })
}

export function selectKeyframe(keyframeId?: string, nodeId?: string): void {
  const current = timelineStore.get()
  timelineStore.set({
    ...current,
    selectedKeyframeId: keyframeId,
    selectedKeyframeIds: keyframeId ? [keyframeId] : [],
    selectedTrackNodeId: nodeId
  })
}

export function selectAllKeyframes(): void {
  const allTracks = nodeTracksStore.get()
  const ids: string[] = []
  for (const nodeTrack of Object.values(allTracks)) {
    for (const propTrack of Object.values(nodeTrack.tracks)) {
      if (!propTrack) continue
      for (const kf of propTrack.keyframes) {
        ids.push(kf.id)
      }
    }
  }
  if (ids.length > 0) {
    const current = timelineStore.get()
    timelineStore.set({
      ...current,
      selectedKeyframeId: ids[0],
      selectedKeyframeIds: ids
    })
  }
}

export function selectMultipleKeyframes(keyframeIds: string[], nodeId?: string): void {
  const current = timelineStore.get()
  timelineStore.set({
    ...current,
    selectedKeyframeId: keyframeIds[0],
    selectedKeyframeIds: keyframeIds,
    selectedTrackNodeId: nodeId
  })
}

export function toggleSelectKeyframe(keyframeId: string): void {
  const current = timelineStore.get()
  const existing =
    current.selectedKeyframeIds ?? (current.selectedKeyframeId ? [current.selectedKeyframeId] : [])
  const next = existing.includes(keyframeId)
    ? existing.filter((id) => id !== keyframeId)
    : [...existing, keyframeId]
  timelineStore.set({
    ...current,
    selectedKeyframeId: next[0],
    selectedKeyframeIds: next
  })
}

export function toggleTrackLock(nodeId: string): void {
  const allTracks = { ...nodeTracksStore.get() }
  const track = allTracks[nodeId]
  if (!track) return
  const nextLocked = !track.locked
  allTracks[nodeId] = { ...track, locked: nextLocked }
  nodeTracksStore.set(allTracks)
  try {
    const store = getActiveEditorStore()
    store.updateNode(nodeId, { locked: nextLocked })
  } catch {
    // test or headless
  }
}

export function toggleTrackHidden(nodeId: string): void {
  const allTracks = { ...nodeTracksStore.get() }
  const track = allTracks[nodeId]
  if (!track) return
  const nextHidden = !track.hidden
  allTracks[nodeId] = { ...track, hidden: nextHidden }
  nodeTracksStore.set(allTracks)
  try {
    const store = getActiveEditorStore()
    store.updateNode(nodeId, { visible: !nextHidden })
    store.requestRepaint()
  } catch {
    // test or headless
  }
}

export function addKeyframe(
  nodeId: string,
  nodeName: string,
  property: AnimatableProperty,
  value: number,
  timeMs?: number,
  easing: KeyframeEasing = 'ease-in-out'
): TimelineKeyframe {
  // Guard: CANVAS (page) nodes are not animatable.
  try {
    const store = getActiveEditorStore()
    const node = store.graph.getNode(nodeId)
    if (node && node.type === 'CANVAS') {
      return { id: generateId(), timeMs: timeMs ?? 0, value, easing }
    }
  } catch {
    // headless / test — continue
  }

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
  persistNodeTrack(nodeId, allTracks[nodeId])
  return resultKeyframe
}

function getPropTrack(nodeId: string, property: AnimatableProperty) {
  const allTracks = { ...nodeTracksStore.get() }
  const nodeTrack = allTracks[nodeId]
  const propTrack = nodeTrack?.tracks[property]
  if (!nodeTrack || !propTrack) return undefined
  return { allTracks, nodeTrack, propTrack }
}

function persistNodeTrack(nodeId: string, track: NodeAnimationTrack | undefined) {
  try {
    const store = getActiveEditorStore()
    if (store.graph.getNode(nodeId)) {
      store.updateNode(nodeId, { motionTracks: track ?? undefined })
    }
  } catch {
    // Ignored in tests/headless without an active editor store
  }
}

export function hydrateTimelineFromGraph(graph: any) {
  if (!graph || typeof graph.getAllNodes !== 'function') return
  const allTracks: Record<string, NodeAnimationTrack> = {}
  let maxKfTime = 0
  for (const node of graph.getAllNodes()) {
    if (!node.motionTracks) continue
    // CANVAS (page) nodes are not animatable
    if (node.type === 'CANVAS') continue
    allTracks[node.id] = node.motionTracks
    if (node.motionTracks.tracks) {
      for (const track of Object.values(node.motionTracks.tracks)) {
        const keyframes = (track as { keyframes?: TimelineKeyframe[] })?.keyframes
        if (Array.isArray(keyframes)) {
          for (const kf of keyframes) {
            if (kf && typeof kf.timeMs === 'number' && kf.timeMs > maxKfTime) {
              maxKfTime = kf.timeMs
            }
          }
        }
      }
    }
  }
  nodeTracksStore.set(allTracks)
  if (maxKfTime > 0) {
    const current = timelineStore.get()
    const targetDuration = Math.max(current.durationMs, Math.ceil(maxKfTime / 500) * 500)
    timelineStore.set({
      ...current,
      durationMs: Math.max(100, Math.min(60000, targetDuration))
    })
  }
}

function updatePropertyKeyframes(
  nodeId: string,
  property: AnimatableProperty,
  updater: (keyframes: TimelineKeyframe[]) => TimelineKeyframe[]
): void {
  const found = getPropTrack(nodeId, property)
  if (!found) return
  const { allTracks, nodeTrack, propTrack } = found

  const nextKfs = updater(propTrack.keyframes)
  allTracks[nodeId] = {
    ...nodeTrack,
    tracks: {
      ...nodeTrack.tracks,
      [property]: {
        property,
        keyframes: nextKfs
      }
    }
  }
  nodeTracksStore.set(allTracks)
  persistNodeTrack(nodeId, allTracks[nodeId])
  applyMotionToCanvas(timelineStore.get().currentTimeMs)
}

export function moveKeyframe(
  nodeId: string,
  property: AnimatableProperty,
  keyframeId: string,
  newTimeMs: number
): void {
  const currentDuration = timelineStore.get().durationMs
  const clampedTime = Math.max(0, Math.min(currentDuration, Math.round(newTimeMs)))
  updatePropertyKeyframes(nodeId, property, (keyframes) => {
    const list = keyframes.map((kf) => (kf.id === keyframeId ? { ...kf, timeMs: clampedTime } : kf))
    list.sort((a, b) => a.timeMs - b.timeMs)
    return list
  })
}

export function setKeyframeEasing(
  nodeId: string,
  property: AnimatableProperty,
  keyframeId: string,
  easing: KeyframeEasing
): void {
  updatePropertyKeyframes(nodeId, property, (keyframes) =>
    keyframes.map((kf) => (kf.id === keyframeId ? { ...kf, easing } : kf))
  )
}

export function addPropertyTrack(
  nodeId: string,
  nodeName: string,
  property: AnimatableProperty,
  initialValue?: number
): TimelineKeyframe {
  let val = initialValue
  if (val === undefined) {
    try {
      const store = getActiveEditorStore()
      const node = store.getNode(nodeId)
      if (node && property in node) {
        val = (node as unknown as Record<string, number>)[property] ?? 0
      }
    } catch {
      val = 0
    }
  }
  return addKeyframe(nodeId, nodeName, property, val ?? 0)
}

export function removeKeyframe(
  nodeId: string,
  property: AnimatableProperty,
  keyframeId: string
): void {
  const found = getPropTrack(nodeId, property)
  if (!found) return
  const { allTracks, nodeTrack, propTrack } = found

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
      persistNodeTrack(nodeId, undefined)
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
  persistNodeTrack(nodeId, allTracks[nodeId])
}

export function clearAllTracks(): void {
  pause()
  const allTracks = nodeTracksStore.get()
  nodeTracksStore.set({})

  try {
    const store = getActiveEditorStore()
    for (const nodeId of Object.keys(allTracks)) {
      if (store.graph.getNode(nodeId)) {
        store.updateNode(nodeId, { motionTracks: undefined })
      }
    }
  } catch {
    // Ignored in tests
  }
  timelineStore.set(DEFAULT_TIMELINE_STATE)
  nodeTracksStore.set({})
}

export function hasKeyframeAt(
  nodeId: string,
  property: AnimatableProperty,
  timeMs: number,
  toleranceMs = 20
): boolean {
  const found = getPropTrack(nodeId, property)
  return (
    found?.propTrack.keyframes.some((kf) => Math.abs(kf.timeMs - timeMs) <= toleranceMs) ?? false
  )
}

export function getKeyframeAt(
  nodeId: string,
  property: AnimatableProperty,
  timeMs: number,
  toleranceMs = 20
): TimelineKeyframe | undefined {
  const found = getPropTrack(nodeId, property)
  return found?.propTrack.keyframes.find((kf) => Math.abs(kf.timeMs - timeMs) <= toleranceMs)
}

export function getAllKeyframeTimes(): number[] {
  const tracks = nodeTracksStore.get()
  const times = new Set<number>()
  for (const nodeTrack of Object.values(tracks)) {
    for (const propTrack of Object.values(nodeTrack.tracks)) {
      if (!propTrack) continue
      for (const kf of propTrack.keyframes) {
        times.add(kf.timeMs)
      }
    }
  }
  return Array.from(times).sort((a, b) => a - b)
}

export function snapToNearestKeyframe(
  timeMs: number,
  thresholdMs = 15,
  excludeKeyframeId?: string
): number {
  const allTracks = nodeTracksStore.get()
  let closestTime = timeMs
  let minDiff = thresholdMs + 1

  for (const nodeTrack of Object.values(allTracks)) {
    for (const propTrack of Object.values(nodeTrack.tracks)) {
      if (!propTrack) continue
      for (const kf of propTrack.keyframes) {
        if (excludeKeyframeId && kf.id === excludeKeyframeId) continue
        const diff = Math.abs(kf.timeMs - timeMs)
        if (diff <= thresholdMs && diff < minDiff) {
          minDiff = diff
          closestTime = kf.timeMs
        }
      }
    }
  }

  return closestTime
}

export function jumpToPreviousKeyframe(): void {
  const { currentTimeMs } = timelineStore.get()
  const times = getAllKeyframeTimes()
  const prevTimes = times.filter((t) => t < currentTimeMs - 5)
  if (prevTimes.length > 0) {
    const target = prevTimes[prevTimes.length - 1]
    if (typeof target === 'number') seek(target)
  } else {
    seek(0)
  }
}

export function jumpToNextKeyframe(): void {
  const { currentTimeMs, durationMs } = timelineStore.get()
  const times = getAllKeyframeTimes()
  const nextTimes = times.filter((t) => t > currentTimeMs + 5)
  if (nextTimes.length > 0) {
    const target = nextTimes[0]
    if (typeof target === 'number') seek(target)
  } else {
    seek(durationMs)
  }
}

export function jumpToPropertyKeyframe(
  nodeId: string,
  property: AnimatableProperty,
  direction: 'prev' | 'next'
): void {
  const tracks = nodeTracksStore.get()
  const propTrack = tracks[nodeId]?.tracks[property]
  if (!propTrack || propTrack.keyframes.length === 0) return
  const current = timelineStore.get().currentTimeMs
  const times = propTrack.keyframes.map((k) => k.timeMs).sort((a, b) => a - b)
  if (direction === 'prev') {
    const prev = times.filter((t) => t < current - 5)
    if (prev.length > 0) {
      seek(prev[prev.length - 1] ?? 0)
    } else {
      seek(times[0] ?? 0)
    }
  } else {
    const next = times.filter((t) => t > current + 5)
    if (next.length > 0) {
      seek(next[0] ?? current)
    } else {
      seek(times[times.length - 1] ?? current)
    }
  }
}

export function autoKeyframeNode(
  nodeId: string,
  property: AnimatableProperty,
  value: number
): void {
  if (!timelineStore.get().isRecording) return
  let nodeName = 'Layer'
  try {
    const store = getActiveEditorStore()
    const node = store.getNode(nodeId)
    if (node?.name) nodeName = node.name
  } catch {
    // headless or test
  }
  addKeyframe(nodeId, nodeName, property, value)
}

const TIMELINE_HEIGHT_KEY = 'openweave_timeline_height'

function getSavedTimelineHeight(): number {
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem(TIMELINE_HEIGHT_KEY)
      if (saved) {
        const val = parseInt(saved, 10)
        if (!Number.isNaN(val) && val >= 180) return val
      }
    } catch {
      // safe fallback
    }
  }
  return 210
}

export const timelineHeightStore = atom<number>(getSavedTimelineHeight())

export function setTimelineHeight(height: number): void {
  timelineHeightStore.set(height)
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(TIMELINE_HEIGHT_KEY, String(height))
    } catch {
      // safe fallback
    }
  }
}

function getSelectedKeyframeIdSet(state: TimelineState): Set<string> {
  const list = state.selectedKeyframeIds?.length
    ? state.selectedKeyframeIds
    : state.selectedKeyframeId
      ? [state.selectedKeyframeId]
      : []
  return new Set(list)
}

export function duplicateSelectedKeyframes(): string[] {
  const current = timelineStore.get()
  const idsToClone = getSelectedKeyframeIdSet(current)
  if (idsToClone.size === 0) return []

  const allTracks = { ...nodeTracksStore.get() }
  const newIds: string[] = []

  for (const [nodeId, nodeTrack] of Object.entries(allTracks)) {
    const updatedSubTracks: Partial<Record<AnimatableProperty, PropertyTrack>> = {
      ...nodeTrack.tracks
    }
    let modified = false

    for (const [propKey, propTrack] of Object.entries(nodeTrack.tracks) as [
      AnimatableProperty,
      PropertyTrack | undefined
    ][]) {
      if (!propTrack) continue
      const toAdd: TimelineKeyframe[] = []
      for (const kf of propTrack.keyframes) {
        if (idsToClone.has(kf.id)) {
          const newId = generateId()
          newIds.push(newId)
          toAdd.push({ ...kf, id: newId })
        }
      }
      if (toAdd.length > 0) {
        modified = true
        const combined = [...propTrack.keyframes, ...toAdd].sort((a, b) => a.timeMs - b.timeMs)
        updatedSubTracks[propKey] = {
          ...propTrack,
          keyframes: combined
        }
      }
    }

    if (modified) {
      allTracks[nodeId] = {
        ...nodeTrack,
        tracks: updatedSubTracks
      }
    }
  }

  if (newIds.length > 0) {
    nodeTracksStore.set(allTracks)
    timelineStore.set({
      ...current,
      selectedKeyframeId: newIds[0],
      selectedKeyframeIds: newIds
    })
  }

  return newIds
}

export function setKeyframeEasingForSelected(easing: KeyframeEasing): void {
  const current = timelineStore.get()
  const selectedIds = getSelectedKeyframeIdSet(current)
  if (selectedIds.size === 0) return

  const allTracks = { ...nodeTracksStore.get() }
  let anyModified = false

  for (const track of Object.values(allTracks)) {
    for (const prop of Object.values(track.tracks)) {
      if (!prop) continue
      const updated: TimelineKeyframe[] = []
      let propChanged = false
      for (const k of prop.keyframes) {
        if (selectedIds.has(k.id)) {
          propChanged = true
          anyModified = true
          updated.push({ ...k, easing })
        } else {
          updated.push(k)
        }
      }
      if (propChanged) {
        prop.keyframes = updated
      }
    }
  }

  if (anyModified) {
    nodeTracksStore.set(allTracks)
  }
}

export function nudgeSelectedKeyframes(deltaMs: number): void {
  moveSelectedKeyframes(deltaMs)
}

export function deleteSelectedKeyframes(): void {
  const current = timelineStore.get()
  const idsToDelete = getSelectedKeyframeIdSet(current)
  if (idsToDelete.size === 0) return

  const allTracks = nodeTracksStore.get()
  const nextTracks: Record<string, NodeAnimationTrack> = {}
  let anyRemoved = false

  for (const [nodeId, nodeTrack] of Object.entries(allTracks)) {
    const updatedSubTracks: Partial<Record<AnimatableProperty, PropertyTrack>> = {}

    for (const [propKey, propTrack] of Object.entries(nodeTrack.tracks) as [
      AnimatableProperty,
      PropertyTrack | undefined
    ][]) {
      if (!propTrack) continue
      const filtered = propTrack.keyframes.filter((kf) => !idsToDelete.has(kf.id))
      if (filtered.length !== propTrack.keyframes.length) {
        anyRemoved = true
      }
      if (filtered.length > 0) {
        updatedSubTracks[propKey] = {
          ...propTrack,
          keyframes: filtered
        }
      }
    }

    if (Object.keys(updatedSubTracks).length > 0) {
      nextTracks[nodeId] = {
        ...nodeTrack,
        tracks: updatedSubTracks
      }
    }
  }

  if (anyRemoved) {
    nodeTracksStore.set(nextTracks)
    timelineStore.set({
      ...current,
      selectedKeyframeId: undefined,
      selectedKeyframeIds: []
    })
    applyMotionToCanvas(current.currentTimeMs)
  }
}

function offsetKeyframe(
  kf: TimelineKeyframe,
  idsToMove: Set<string>,
  deltaMs: number,
  durationMs: number
): TimelineKeyframe {
  if (!idsToMove.has(kf.id)) return kf
  const clampedTime = Math.max(0, Math.min(durationMs, Math.round(kf.timeMs + deltaMs)))
  return { ...kf, timeMs: clampedTime }
}

export function moveSelectedKeyframes(deltaMs: number): void {
  if (deltaMs === 0) return
  const current = timelineStore.get()
  const idsToMove = getSelectedKeyframeIdSet(current)
  if (idsToMove.size === 0) return

  const durationMs = current.durationMs
  const allTracks = { ...nodeTracksStore.get() }

  for (const [nodeId, nodeTrack] of Object.entries(allTracks)) {
    const updatedSubTracks: Partial<Record<AnimatableProperty, PropertyTrack>> = {}
    let trackModified = false

    for (const [propKey, propTrack] of Object.entries(nodeTrack.tracks) as [
      AnimatableProperty,
      PropertyTrack | undefined
    ][]) {
      if (!propTrack) continue
      const updatedKfs = propTrack.keyframes.map((kf) =>
        offsetKeyframe(kf, idsToMove, deltaMs, durationMs)
      )
      const propModified = updatedKfs.some(
        (kf, idx) => kf.timeMs !== propTrack.keyframes[idx]?.timeMs
      )

      if (propModified) {
        trackModified = true
        updatedKfs.sort((a, b) => a.timeMs - b.timeMs)
      }

      updatedSubTracks[propKey] = {
        ...propTrack,
        keyframes: updatedKfs
      }
    }

    if (trackModified) {
      allTracks[nodeId] = {
        ...nodeTrack,
        tracks: updatedSubTracks
      }
    }
  }

  nodeTracksStore.set(allTracks)
  applyMotionToCanvas(current.currentTimeMs)
}

export function applyMotionPreset(nodeId: string, preset: MotionPreset): void {
  const current = timelineStore.get()
  const startT = current.currentTimeMs
  let nodeName = 'Layer'
  let curY = 0
  let curW = 100
  let curH = 100
  let curOp = 1

  try {
    const store = getActiveEditorStore()
    const node = store.getNode(nodeId)
    if (node) {
      if (node.name) nodeName = node.name
      if (typeof node.y === 'number') curY = node.y
      if (typeof node.width === 'number') curW = node.width
      if (typeof node.height === 'number') curH = node.height
      const maybeOp = (node as unknown as Record<string, number>).opacity
      if (typeof maybeOp === 'number') curOp = maybeOp
    }
  } catch {
    // fallback defaults
  }

  const requiredDuration = startT + 650
  if (requiredDuration > current.durationMs) {
    setDuration(requiredDuration)
  }

  switch (preset) {
    case 'fadeIn':
      addKeyframe(nodeId, nodeName, 'opacity', 0, startT, 'ease-out')
      addKeyframe(nodeId, nodeName, 'opacity', curOp > 0 ? curOp : 1, startT + 400, 'ease-out')
      break
    case 'slideUp':
      addKeyframe(nodeId, nodeName, 'y', curY + 40, startT, 'ease-out')
      addKeyframe(nodeId, nodeName, 'y', curY, startT + 450, 'ease-out')
      addKeyframe(nodeId, nodeName, 'opacity', 0, startT, 'ease-out')
      addKeyframe(nodeId, nodeName, 'opacity', curOp > 0 ? curOp : 1, startT + 350, 'ease-out')
      break
    case 'scalePop':
      addKeyframe(nodeId, nodeName, 'width', Math.round(curW * 0.8), startT, 'spring')
      addKeyframe(nodeId, nodeName, 'width', curW, startT + 400, 'spring')
      addKeyframe(nodeId, nodeName, 'height', Math.round(curH * 0.8), startT, 'spring')
      addKeyframe(nodeId, nodeName, 'height', curH, startT + 400, 'spring')
      addKeyframe(nodeId, nodeName, 'opacity', 0, startT, 'ease-out')
      addKeyframe(nodeId, nodeName, 'opacity', curOp > 0 ? curOp : 1, startT + 250, 'ease-out')
      break
    case 'springBounce':
      addKeyframe(nodeId, nodeName, 'y', curY - 50, startT, 'spring')
      addKeyframe(nodeId, nodeName, 'y', curY, startT + 600, 'spring')
      break
    case 'pulse':
      addKeyframe(nodeId, nodeName, 'opacity', curOp, startT, 'ease-in-out')
      addKeyframe(
        nodeId,
        nodeName,
        'opacity',
        Math.max(0.2, curOp * 0.4),
        startT + 300,
        'ease-in-out'
      )
      addKeyframe(nodeId, nodeName, 'opacity', curOp, startT + 600, 'ease-in-out')
      break
  }
}
