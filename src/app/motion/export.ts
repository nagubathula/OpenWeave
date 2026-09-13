import type {
  AnimatableProperty,
  KeyframeEasing,
  NodeAnimationTrack,
  PropertyTrack
} from '@/app/motion/types'

function mapEasingToCss(easing?: KeyframeEasing): string {
  switch (easing) {
    case 'linear':
      return 'linear'
    case 'ease-in':
      return 'cubic-bezier(0.42, 0, 1, 1)'
    case 'ease-out':
      return 'cubic-bezier(0, 0, 0.58, 1)'
    case 'ease-in-out':
      return 'cubic-bezier(0.42, 0, 0.58, 1)'
    case 'spring':
      return 'cubic-bezier(0.34, 1.56, 0.64, 1)'
    default:
      return 'ease-in-out'
  }
}

function mapEasingToFramer(easing?: KeyframeEasing): string {
  switch (easing) {
    case 'linear':
      return '"linear"'
    case 'ease-in':
      return '"easeIn"'
    case 'ease-out':
      return '"easeOut"'
    case 'ease-in-out':
      return '"easeInOut"'
    case 'spring':
      return '{ type: "spring", stiffness: 300, damping: 20 }'
    default:
      return '"easeInOut"'
  }
}

interface FrameSnapshot {
  timeMs: number
  offset: number
  transform?: string
  opacity?: number
  width?: number
  height?: number
  cornerRadius?: number
}

function collectKeyframeSnapshots(track: NodeAnimationTrack, durationMs: number): FrameSnapshot[] {
  const times = new Set<number>()
  for (const propTrack of Object.values(track.tracks)) {
    if (!propTrack) continue
    for (const kf of propTrack.keyframes) {
      times.add(kf.timeMs)
    }
  }

  const sortedTimes = Array.from(times).sort((a, b) => a - b)
  if (sortedTimes.length === 0) {
    sortedTimes.push(0, durationMs)
  }

  const maxTime = Math.max(durationMs, sortedTimes[sortedTimes.length - 1] ?? durationMs)

  return sortedTimes.map((timeMs) => {
    const snap: FrameSnapshot = {
      timeMs,
      offset: Math.round((timeMs / maxTime) * 100) / 100
    }
    const rawValues: Partial<Record<AnimatableProperty, number>> = {}
    for (const [prop, propTrack] of Object.entries(track.tracks) as [
      AnimatableProperty,
      PropertyTrack | undefined
    ][]) {
      if (!propTrack) continue
      const kf =
        propTrack.keyframes.find((k) => Math.abs(k.timeMs - timeMs) <= 5) ?? propTrack.keyframes[0]
      if (kf) {
        rawValues[prop] = kf.value
      }
    }

    const tParts: string[] = []
    if (typeof rawValues.x === 'number') tParts.push(`translateX(${rawValues.x}px)`)
    if (typeof rawValues.y === 'number') tParts.push(`translateY(${rawValues.y}px)`)
    if (typeof rawValues.rotation === 'number') tParts.push(`rotate(${rawValues.rotation}deg)`)
    if (tParts.length > 0) snap.transform = tParts.join(' ')

    if (typeof rawValues.opacity === 'number') snap.opacity = rawValues.opacity
    if (typeof rawValues.width === 'number') snap.width = rawValues.width
    if (typeof rawValues.height === 'number') snap.height = rawValues.height
    if (typeof rawValues.cornerRadius === 'number') snap.cornerRadius = rawValues.cornerRadius

    return snap
  })
}

export function generateFramerMotion(track: NodeAnimationTrack, durationMs: number): string {
  const initial: Record<string, number> = {}
  const animate: Record<string, number | number[]> = {}
  let primaryEasing: KeyframeEasing = 'ease-in-out'
  let hasMultiKeyframe = false
  let multiTimes: number[] = []

  for (const [prop, propTrack] of Object.entries(track.tracks) as [
    string,
    PropertyTrack | undefined
  ][]) {
    if (!propTrack || propTrack.keyframes.length === 0) continue
    const first = propTrack.keyframes[0]
    const last = propTrack.keyframes[propTrack.keyframes.length - 1]
    if (first) {
      initial[prop] = first.value
      if (first.easing) primaryEasing = first.easing
    }
    if (propTrack.keyframes.length > 2) {
      hasMultiKeyframe = true
      animate[prop] = propTrack.keyframes.map((k) => k.value)
      if (multiTimes.length === 0) {
        multiTimes = propTrack.keyframes.map(
          (k) => Math.round((k.timeMs / Math.max(durationMs, 1)) * 1000) / 1000
        )
      }
    } else if (last) {
      animate[prop] = last.value
    }
  }

  const durationSec = Math.round((durationMs / 1000) * 100) / 100
  const initialStr = JSON.stringify(initial, null, 2)
  const animateStr = JSON.stringify(animate, null, 2)
  const easeStr = mapEasingToFramer(primaryEasing)

  const transitionLines = [
    `        duration: ${durationSec}`,
    primaryEasing === 'spring' && !hasMultiKeyframe
      ? '        type: "spring",\n        stiffness: 300,\n        damping: 20'
      : `        ease: ${easeStr}`,
    hasMultiKeyframe && multiTimes.length > 0 ? `        times: ${JSON.stringify(multiTimes)}` : null
  ].filter(Boolean)

  return `// Framer Motion Export for ${track.nodeName || 'Layer'}
import { motion } from 'framer-motion'

export function Animated${(track.nodeName || 'Component').replace(/[^a-zA-Z0-9]/g, '')}() {
  return (
    <motion.div
      initial={${initialStr}}
      animate={${animateStr}}
      transition={{
${transitionLines.join(',\n')}
      }}
    >
      {/* Content */}
    </motion.div>
  )
}`
}

export function generateCssKeyframes(track: NodeAnimationTrack, durationMs: number): string {
  const animName = `anim-${(track.nodeName || 'layer').toLowerCase().replace(/[^a-z0-9]/g, '-')}`
  const snapshots = collectKeyframeSnapshots(track, durationMs)
  const steps: string[] = []

  for (const s of snapshots) {
    const pct = Math.round(s.offset * 100)
    const cssLines: string[] = []

    if (s.transform) cssLines.push(`    transform: ${s.transform};`)
    if (typeof s.opacity === 'number') cssLines.push(`    opacity: ${s.opacity};`)
    if (typeof s.width === 'number') cssLines.push(`    width: ${s.width}px;`)
    if (typeof s.height === 'number') cssLines.push(`    height: ${s.height}px;`)
    if (typeof s.cornerRadius === 'number') cssLines.push(`    border-radius: ${s.cornerRadius}px;`)

    steps.push(`  ${pct}% {\n${cssLines.join('\n')}\n  }`)
  }

  const durationSec = Math.round((durationMs / 1000) * 100) / 100
  const firstKf = Object.values(track.tracks)[0]?.keyframes[0]
  const easingCss = mapEasingToCss(firstKf?.easing)

  return `@keyframes ${animName} {
${steps.join('\n')}
}

.${animName} {
  animation: ${animName} ${durationSec}s ${easingCss} forwards;
}`
}

export function generateWebAnimations(track: NodeAnimationTrack, durationMs: number): string {
  const snapshots = collectKeyframeSnapshots(track, durationMs)
  const keyframeObjects: Record<string, unknown>[] = []

  for (const s of snapshots) {
    const obj: Record<string, unknown> = { offset: s.offset }

    if (s.transform) obj.transform = s.transform
    if (typeof s.opacity === 'number') obj.opacity = s.opacity
    if (typeof s.width === 'number') obj.width = `${s.width}px`
    if (typeof s.height === 'number') obj.height = `${s.height}px`
    if (typeof s.cornerRadius === 'number') obj.borderRadius = `${s.cornerRadius}px`

    keyframeObjects.push(obj)
  }

  return `// Web Animations API
const element = document.querySelector('.target-element')

element.animate(${JSON.stringify(keyframeObjects, null, 2)}, {
  duration: ${durationMs},
  easing: 'ease-in-out',
  fill: 'forwards'
})`
}
