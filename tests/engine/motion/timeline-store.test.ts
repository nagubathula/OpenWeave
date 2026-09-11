import { describe, expect, it, beforeEach } from 'bun:test'

import {
  addKeyframe,
  clearAllTracks,
  getKeyframeAt,
  hasKeyframeAt,
  interpolateProperty,
  nodeTracksStore,
  removeKeyframe,
  seek,
  setDuration,
  timelineStore
} from '@/app/motion/store'
import type { PropertyTrack } from '@/app/motion/types'

describe('Motion Timeline Store', () => {
  beforeEach(() => {
    clearAllTracks()
  })

  it('initializes with default timeline parameters', () => {
    const state = timelineStore.get()
    expect(state.currentTimeMs).toBe(0)
    expect(state.durationMs).toBe(2000)
    expect(state.isPlaying).toBe(false)
    expect(state.loop).toBe(true)
  })

  it('seeks within duration bounds', () => {
    seek(500)
    expect(timelineStore.get().currentTimeMs).toBe(500)

    seek(2500)
    expect(timelineStore.get().currentTimeMs).toBe(2000)

    seek(-100)
    expect(timelineStore.get().currentTimeMs).toBe(0)
  })

  it('sets duration and clamps current time if needed', () => {
    seek(1500)
    setDuration(1000)
    expect(timelineStore.get().durationMs).toBe(1000)
    expect(timelineStore.get().currentTimeMs).toBe(1000)
  })

  it('adds, finds, and removes keyframes on a node track', () => {
    const kf1 = addKeyframe('rect-1', 'Rectangle 1', 'x', 100, 0)
    const kf2 = addKeyframe('rect-1', 'Rectangle 1', 'x', 300, 1000)

    expect(kf1.value).toBe(100)
    expect(kf2.value).toBe(300)

    const tracks = nodeTracksStore.get()
    expect(tracks['rect-1']).toBeDefined()
    expect(tracks['rect-1']?.tracks.x?.keyframes.length).toBe(2)

    expect(hasKeyframeAt('rect-1', 'x', 0)).toBe(true)
    expect(hasKeyframeAt('rect-1', 'x', 1000)).toBe(true)
    expect(hasKeyframeAt('rect-1', 'x', 500)).toBe(false)

    const found = getKeyframeAt('rect-1', 'x', 1000)
    expect(found?.id).toBe(kf2.id)

    removeKeyframe('rect-1', 'x', kf1.id)
    expect(nodeTracksStore.get()['rect-1']?.tracks.x?.keyframes.length).toBe(1)
  })

  it('interpolates property values smoothly across time', () => {
    const track: PropertyTrack = {
      property: 'x',
      keyframes: [
        { id: '1', timeMs: 0, value: 0 },
        { id: '2', timeMs: 1000, value: 100 }
      ]
    }

    expect(interpolateProperty(track, 0)).toBe(0)
    expect(interpolateProperty(track, 1000)).toBe(100)

    // Midpoint should be 50 with symmetrical ease
    const mid = interpolateProperty(track, 500)
    expect(mid).toBe(50)

    // Clamped outside bounds
    expect(interpolateProperty(track, -100)).toBe(0)
    expect(interpolateProperty(track, 1200)).toBe(100)
  })
})
