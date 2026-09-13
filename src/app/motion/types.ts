export type {
  AnimatableProperty,
  KeyframeEasing,
  TimelineKeyframe,
  PropertyTrack,
  NodeAnimationTrack
} from '@openweave/scene-graph'

export type MotionPreset = 'fadeIn' | 'slideUp' | 'scalePop' | 'springBounce' | 'pulse'

export interface TimelineState {
  currentTimeMs: number
  durationMs: number
  isPlaying: boolean
  zoom: number
  loop: boolean
  playbackSpeed?: number
  timeFormat?: 'ms' | 'frames'
  isRecording: boolean
  selectedKeyframeId?: string
  selectedKeyframeIds?: string[]
  selectedTrackNodeId?: string
}
