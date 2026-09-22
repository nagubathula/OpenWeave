import { describe, expect, test } from 'bun:test'

import { nudgeSettings, setNudgeSettings } from '@/app/editor/nudge-settings'

describe('nudge settings', () => {
  test('updates small and big nudge amounts', () => {
    setNudgeSettings({ small: 2, big: 16 })
    expect(nudgeSettings.get().small).toBe(2)
    expect(nudgeSettings.get().big).toBe(16)

    // Reset back to defaults
    setNudgeSettings({ small: 1, big: 10 })
    expect(nudgeSettings.get().small).toBe(1)
    expect(nudgeSettings.get().big).toBe(10)
  })

  test('enforces minimum values', () => {
    setNudgeSettings({ small: -5, big: -10 })
    expect(nudgeSettings.get().small).toBe(0.1)
    expect(nudgeSettings.get().big).toBe(1)

    // Reset back
    setNudgeSettings({ small: 1, big: 10 })
  })
})
