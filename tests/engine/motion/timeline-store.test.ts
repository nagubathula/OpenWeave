import { describe, expect, it, beforeEach } from 'bun:test'

import { SceneGraph } from '@openweave/scene-graph'

import {
  addKeyframe,
  applyMotionPreset,
  autoKeyframeNode,
  clearAllTracks,
  deleteSelectedKeyframes,
  duplicateSelectedKeyframes,
  getKeyframeAt,
  hasKeyframeAt,
  interpolateProperty,
  jumpToNextKeyframe,
  jumpToPreviousKeyframe,
  jumpToPropertyKeyframe,
  moveKeyframe,
  moveSelectedKeyframes,
  nodeTracksStore,
  nudgeSelectedKeyframes,
  removeKeyframe,
  seek,
  selectAllKeyframes,
  selectKeyframe,
  selectMultipleKeyframes,
  setDuration,
  setKeyframeEasingForSelected,
  setPlaybackSpeed,
  setTimeFormat,
  hydrateTimelineFromGraph,
  snapToNearestKeyframe,
  timelineStore,
  toggleRecording,
  toggleSelectKeyframe,
  toggleTrackHidden,
  toggleTrackLock
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

  it('supports moving keyframes and clamping within duration', () => {
    const kf = addKeyframe('rect-1', 'Rectangle 1', 'x', 150, 400)
    moveKeyframe('rect-1', 'x', kf.id, 800)

    const updated = getKeyframeAt('rect-1', 'x', 800)
    expect(updated).toBeDefined()
    expect(updated?.timeMs).toBe(800)
    expect(hasKeyframeAt('rect-1', 'x', 400)).toBe(false)

    // Moving beyond duration clamps to duration
    moveKeyframe('rect-1', 'x', kf.id, 5000)
    expect(hasKeyframeAt('rect-1', 'x', 2000)).toBe(true)
  })

  it('supports keyframe easing curves', () => {
    const kf = addKeyframe('rect-1', 'Rectangle 1', 'y', 50, 0, 'linear')
    addKeyframe('rect-1', 'Rectangle 1', 'y', 150, 1000)

    const nodeTrack = nodeTracksStore.get()['rect-1']
    const propTrack = nodeTrack?.tracks.y
    expect(propTrack).toBeDefined()
    if (!propTrack) return

    // Linear interpolation at 50% should be 100
    expect(interpolateProperty(propTrack, 500)).toBe(100)
  })

  it('jumps between keyframes correctly', () => {
    addKeyframe('rect-1', 'Rectangle 1', 'x', 0, 100)
    addKeyframe('rect-1', 'Rectangle 1', 'x', 50, 600)
    addKeyframe('rect-2', 'Circle 1', 'opacity', 1, 1400)

    seek(0)
    jumpToNextKeyframe()
    expect(timelineStore.get().currentTimeMs).toBe(100)

    jumpToNextKeyframe()
    expect(timelineStore.get().currentTimeMs).toBe(600)

    jumpToNextKeyframe()
    expect(timelineStore.get().currentTimeMs).toBe(1400)

    jumpToPreviousKeyframe()
    expect(timelineStore.get().currentTimeMs).toBe(600)
  })

  it('supports recording mode toggling and autoKeyframeNode', () => {
    expect(timelineStore.get().isRecording).toBe(false)

    toggleRecording(true)
    expect(timelineStore.get().isRecording).toBe(true)

    seek(350)
    autoKeyframeNode('rect-1', 'rotation', 45)

    expect(hasKeyframeAt('rect-1', 'rotation', 350)).toBe(true)
    expect(getKeyframeAt('rect-1', 'rotation', 350)?.value).toBe(45)

    toggleRecording(false)
    seek(700)
    autoKeyframeNode('rect-1', 'rotation', 90)
    // When recording is disabled, autoKeyframeNode should not add a keyframe
    expect(hasKeyframeAt('rect-1', 'rotation', 700)).toBe(false)
  })

  it('handles multi-selection and toggle selection of keyframes', () => {
    const kf1 = addKeyframe('rect-1', 'Layer', 'x', 0, 100)
    const kf2 = addKeyframe('rect-1', 'Layer', 'x', 50, 400)
    const kf3 = addKeyframe('rect-1', 'Layer', 'y', 20, 400)

    selectKeyframe(kf1.id, 'rect-1')
    expect(timelineStore.get().selectedKeyframeId).toBe(kf1.id)
    expect(timelineStore.get().selectedKeyframeIds).toEqual([kf1.id])

    selectMultipleKeyframes([kf1.id, kf2.id, kf3.id], 'rect-1')
    expect(timelineStore.get().selectedKeyframeIds).toEqual([kf1.id, kf2.id, kf3.id])

    toggleSelectKeyframe(kf2.id)
    expect(timelineStore.get().selectedKeyframeIds).toEqual([kf1.id, kf3.id])
  })

  it('deletes selected keyframes in batch', () => {
    const kf1 = addKeyframe('rect-1', 'Layer', 'x', 0, 100)
    const kf2 = addKeyframe('rect-1', 'Layer', 'x', 50, 400)
    const kf3 = addKeyframe('rect-1', 'Layer', 'x', 100, 800)

    selectMultipleKeyframes([kf1.id, kf3.id])
    deleteSelectedKeyframes()

    const remaining = nodeTracksStore.get()['rect-1']?.tracks.x?.keyframes
    expect(remaining?.length).toBe(1)
    expect(remaining?.[0]?.id).toBe(kf2.id)
    expect(timelineStore.get().selectedKeyframeIds).toEqual([])
  })

  it('moves multiple selected keyframes synchronously', () => {
    const kf1 = addKeyframe('rect-1', 'Layer', 'x', 0, 100)
    const kf2 = addKeyframe('rect-1', 'Layer', 'y', 20, 300)

    selectMultipleKeyframes([kf1.id, kf2.id])
    moveSelectedKeyframes(200)

    expect(getKeyframeAt('rect-1', 'x', 300)?.id).toBe(kf1.id)
    expect(getKeyframeAt('rect-1', 'y', 500)?.id).toBe(kf2.id)
  })

  it('toggles track locked and hidden states', () => {
    addKeyframe('rect-1', 'Layer', 'x', 0, 0)
    expect(nodeTracksStore.get()['rect-1']?.locked).toBeFalsy()
    expect(nodeTracksStore.get()['rect-1']?.hidden).toBeFalsy()

    toggleTrackLock('rect-1')
    expect(nodeTracksStore.get()['rect-1']?.locked).toBe(true)

    toggleTrackHidden('rect-1')
    expect(nodeTracksStore.get()['rect-1']?.hidden).toBe(true)
  })

  it('applies motion presets correctly', () => {
    applyMotionPreset('rect-1', 'fadeIn')
    const track = nodeTracksStore.get()['rect-1']
    expect(track).toBeDefined()
    expect(track?.tracks.opacity?.keyframes.length).toBe(2)

    applyMotionPreset('rect-1', 'springBounce')
    expect(nodeTracksStore.get()['rect-1']?.tracks.y?.keyframes.length).toBe(2)
  })

  it('duplicates selected keyframes correctly', () => {
    const kf1 = addKeyframe('rect-1', 'Layer', 'x', 0, 100)
    const kf2 = addKeyframe('rect-1', 'Layer', 'x', 50, 400)

    selectKeyframe(kf1.id)
    const clonedIds = duplicateSelectedKeyframes()

    expect(clonedIds.length).toBe(1)
    expect(clonedIds[0]).not.toBe(kf1.id)

    const keyframes = nodeTracksStore.get()['rect-1']?.tracks.x?.keyframes
    expect(keyframes?.length).toBe(3)
    expect(timelineStore.get().selectedKeyframeIds).toEqual(clonedIds)
  })

  it('sets playback speed and time format', () => {
    setPlaybackSpeed(2)
    expect(timelineStore.get().playbackSpeed).toBe(2)

    setTimeFormat('frames')
    expect(timelineStore.get().timeFormat).toBe('frames')
  })

  it('magnetically snaps to nearest keyframe', () => {
    addKeyframe('rect-1', 'Layer', 'x', 0, 100)
    addKeyframe('rect-1', 'Layer', 'x', 50, 500)

    // Within threshold (108 is within 15ms of 100)
    expect(snapToNearestKeyframe(108)).toBe(100)
    // Outside threshold (130 is > 15ms from 100)
    expect(snapToNearestKeyframe(130)).toBe(130)
    // Snaps to 500 when at 495
    expect(snapToNearestKeyframe(495)).toBe(500)
  })

  it('selects all keyframes and batch updates easings', () => {
    const kf1 = addKeyframe('rect-1', 'Layer', 'x', 0, 100, 'linear')
    const kf2 = addKeyframe('rect-1', 'Layer', 'y', 20, 300, 'linear')

    selectAllKeyframes()
    expect(timelineStore.get().selectedKeyframeIds).toContain(kf1.id)
    expect(timelineStore.get().selectedKeyframeIds).toContain(kf2.id)

    setKeyframeEasingForSelected('spring')
    const trackX = nodeTracksStore.get()['rect-1']?.tracks.x
    const trackY = nodeTracksStore.get()['rect-1']?.tracks.y
    expect(trackX?.keyframes[0]?.easing).toBe('spring')
    expect(trackY?.keyframes[0]?.easing).toBe('spring')

    nudgeSelectedKeyframes(50)
    const nudgedTrackX = nodeTracksStore.get()['rect-1']?.tracks.x
    const nudgedTrackY = nodeTracksStore.get()['rect-1']?.tracks.y
    expect(nudgedTrackX?.keyframes[0]?.timeMs).toBe(150)
    expect(nudgedTrackY?.keyframes[0]?.timeMs).toBe(350)
  })

  it('jumps to previous and next keyframes for a specific property', () => {
    addKeyframe('rect-1', 'Layer', 'x', 0, 100)
    addKeyframe('rect-1', 'Layer', 'x', 50, 400)
    addKeyframe('rect-1', 'Layer', 'x', 100, 800)

    seek(500)
    jumpToPropertyKeyframe('rect-1', 'x', 'prev')
    expect(timelineStore.get().currentTimeMs).toBe(400)

    jumpToPropertyKeyframe('rect-1', 'x', 'next')
    expect(timelineStore.get().currentTimeMs).toBe(800)

    jumpToPropertyKeyframe('rect-1', 'x', 'prev')
    expect(timelineStore.get().currentTimeMs).toBe(400)

    jumpToPropertyKeyframe('rect-1', 'x', 'prev')
    expect(timelineStore.get().currentTimeMs).toBe(100)
  })

  it('hydrates timeline from scene graph including top-level frames and adjusts duration', () => {
    const graph = new SceneGraph()
    const page = graph.getPages()[0]

    const frame = graph.createNode('FRAME', page.id, {
      name: 'Card Pop',
      x: 0,
      y: 0,
      width: 300,
      height: 200,
      motionTracks: {
        nodeId: '',
        nodeName: 'Card Pop',
        tracks: {
          opacity: {
            property: 'opacity',
            keyframes: [
              { id: 'kf-a', timeMs: 0, value: 0, easing: 'ease-out' },
              { id: 'kf-b', timeMs: 3500, value: 1, easing: 'ease-out' }
            ]
          }
        }
      }
    })

    graph.createNode('RECTANGLE', frame.id, {
      name: 'Button',
      x: 20,
      y: 20,
      width: 80,
      height: 40,
      motionTracks: {
        nodeId: '',
        nodeName: 'Button',
        tracks: {
          scale: {
            property: 'scale',
            keyframes: [{ id: 'kf-c', timeMs: 4000, value: 1.2, easing: 'spring' }]
          }
        }
      }
    })

    hydrateTimelineFromGraph(graph)

    const tracks = nodeTracksStore.get()
    expect(tracks[frame.id]).toBeDefined()
    expect(tracks[frame.id]?.nodeName).toBe('Card Pop')
    expect(tracks[frame.id]?.tracks.opacity?.keyframes).toHaveLength(2)

    const duration = timelineStore.get().durationMs
    expect(duration).toBeGreaterThanOrEqual(4000)
  })
})
