export type AnimatableProperty = 'x' | 'y' | 'width' | 'height' | 'rotation' | 'opacity'

export interface TimelineKeyframe {
  id: string
  timeMs: number
  value: number
  easing?: string
}

export interface PropertyTrack {
  property: AnimatableProperty
  keyframes: TimelineKeyframe[]
}

export interface NodeAnimationTrack {
  nodeId: string
  nodeName: string
  tracks: Partial<Record<AnimatableProperty, PropertyTrack>>
}

export interface TimelineState {
  currentTimeMs: number
  durationMs: number
  isPlaying: boolean
  zoom: number
  loop: boolean
  selectedKeyframeId?: string
  selectedTrackNodeId?: string
}
