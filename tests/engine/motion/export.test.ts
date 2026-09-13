import { describe, expect, it } from 'bun:test'

import {
  generateCssKeyframes,
  generateFramerMotion,
  generateWebAnimations
} from '@/app/motion/export'
import type { NodeAnimationTrack } from '@/app/motion/types'

describe('Motion Code Export', () => {
  const sampleTrack: NodeAnimationTrack = {
    nodeId: 'rect-1',
    nodeName: 'Card Box',
    tracks: {
      x: {
        property: 'x',
        keyframes: [
          { id: '1', timeMs: 0, value: 0, easing: 'ease-out' },
          { id: '2', timeMs: 500, value: 120, easing: 'ease-out' }
        ]
      },
      opacity: {
        property: 'opacity',
        keyframes: [
          { id: '3', timeMs: 0, value: 0 },
          { id: '4', timeMs: 400, value: 1 }
        ]
      }
    }
  }

  it('generates clean Framer Motion component code', () => {
    const code = generateFramerMotion(sampleTrack, 1000)
    expect(code).toContain("import { motion } from 'framer-motion'")
    expect(code).toContain('AnimatedCardBox')
    expect(code).toContain('initial={')
    expect(code).toContain('animate={')
    expect(code).toContain('transition={{')
    expect(code).toContain('"easeOut"')
  })

  it('generates multi-step keyframe arrays for complex animated components', () => {
    const multiTrack: NodeAnimationTrack = {
      nodeId: 'toggle-thumb',
      nodeName: 'Toggle Thumb',
      tracks: {
        x: {
          property: 'x',
          keyframes: [
            { id: '1', timeMs: 0, value: 8 },
            { id: '2', timeMs: 500, value: 70 },
            { id: '3', timeMs: 1000, value: 8 }
          ]
        }
      }
    }
    const code = generateFramerMotion(multiTrack, 1000)
    expect(code).toContain('AnimatedToggleThumb')
    expect(code).toContain('"x": [\n    8,\n    70,\n    8\n  ]')
    expect(code).toContain('times: [0,0.5,1]')
  })

  it('generates standard CSS @keyframes and class', () => {
    const code = generateCssKeyframes(sampleTrack, 1000)
    expect(code).toContain('@keyframes anim-card-box')
    expect(code).toContain('.anim-card-box {')
    expect(code).toContain('transform: translateX(0px)')
    expect(code).toContain('transform: translateX(120px)')
    expect(code).toContain('animation: anim-card-box')
  })

  it('generates Web Animations API call', () => {
    const code = generateWebAnimations(sampleTrack, 1000)
    expect(code).toContain('element.animate(')
    expect(code).toContain('"transform": "translateX(0px)"')
    expect(code).toContain('duration: 1000')
  })
})
