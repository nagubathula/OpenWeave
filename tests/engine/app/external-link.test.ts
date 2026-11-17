import { describe, test, expect, vi, beforeEach, afterEach } from 'bun:test'

import { openExternalLink } from '@/app/shell/ui'

import { clearDesktopMocks } from '#tests/helpers/desktop-mocks'

/** Browser (window.open) and desktop (Electron shell) link opening. */
describe('openExternalLink', () => {
  let mockOpen: ReturnType<typeof vi.fn>

  beforeEach(() => {
    mockOpen = vi.fn().mockReturnValue(null)
    globalThis.window = { open: mockOpen } as Window & typeof globalThis
  })

  afterEach(() => {
    clearDesktopMocks()
    vi.restoreAllMocks()
  })

  test('calls window.open with _blank target for OpenRouter key URL', async () => {
    await openExternalLink('https://openrouter.ai/keys')

    expect(mockOpen).toHaveBeenCalledWith('https://openrouter.ai/keys', '_blank')
  })

  test('calls window.open with _blank target for Anthropic key URL', async () => {
    await openExternalLink('https://console.anthropic.com/settings/keys')

    expect(mockOpen).toHaveBeenCalledWith('https://console.anthropic.com/settings/keys', '_blank')
  })

  test('passes arbitrary URL unchanged', async () => {
    await openExternalLink('https://example.com/docs')

    expect(mockOpen).toHaveBeenCalledWith('https://example.com/docs', '_blank')
  })

  test('opens links through Electron shell when running in desktop', async () => {
    const openExternal = vi.fn().mockResolvedValue(undefined)
    ;(globalThis.window as any).electron = {
      shell: { openExternal }
    }

    await openExternalLink('https://example.com/docs')

    expect(openExternal).toHaveBeenCalledWith('https://example.com/docs')
    expect(mockOpen).not.toHaveBeenCalled()
  })
})
