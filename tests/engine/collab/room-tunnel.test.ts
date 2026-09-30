import { describe, expect, it } from 'bun:test'

import {
  getTunnelShareUrl,
  savedTunnelUrl,
  setCustomTunnelUrl,
  shareTunnelState
} from '@/app/collab/tunnel'
import { DEFAULT_COLLAB_STATE } from '@/app/collab/types'
import { getShareUrl } from '@/constants'

describe('collab room & tunnel url helpers', () => {
  it('generates share URL with password indicator when protected', () => {
    const urlNormal = getShareUrl('room-123')
    expect(urlNormal).toContain('/share?room=room-123')
    expect(urlNormal).not.toContain('pwd=')

    const urlProtected = getShareUrl('room-123', true)
    expect(urlProtected).toContain('/share?room=room-123&pwd=1')
  })

  it('generates tunnel share URL with password indicator when protected', () => {
    const publicUrl = 'https://smoked-puritan-swarm.ngrok-free.dev'
    const normal = getTunnelShareUrl(publicUrl, 'room-abc')
    expect(normal).toBe('https://smoked-puritan-swarm.ngrok-free.dev/share?room=room-abc')

    const protectedUrl = getTunnelShareUrl(publicUrl, 'room-abc', true)
    expect(protectedUrl).toBe(
      'https://smoked-puritan-swarm.ngrok-free.dev/share?room=room-abc&pwd=1'
    )
  })

  it('sets and updates custom tunnel URL in stores', () => {
    setCustomTunnelUrl('https://custom-tunnel.ngrok.app')
    expect(savedTunnelUrl.get()).toBe('https://custom-tunnel.ngrok.app')
    expect(shareTunnelState.get()).toEqual({
      status: 'active',
      url: 'https://custom-tunnel.ngrok.app'
    })

    // Auto-prefixes https:// if omitted
    setCustomTunnelUrl('my-tunnel.ngrok-free.app')
    expect(savedTunnelUrl.get()).toBe('https://my-tunnel.ngrok-free.app')

    // Reset back to user's tunnel URL
    setCustomTunnelUrl('https://smoked-puritan-swarm.ngrok-free.dev')
    expect(savedTunnelUrl.get()).toBe('https://smoked-puritan-swarm.ngrok-free.dev')
  })

  it('includes isProtected in DEFAULT_COLLAB_STATE', () => {
    expect(DEFAULT_COLLAB_STATE.isProtected).toBe(false)
  })
})
