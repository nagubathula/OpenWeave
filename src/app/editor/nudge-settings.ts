import { atom } from 'nanostores'

export interface NudgeSettings {
  small: number
  big: number
}

const NUDGE_STORAGE_KEY_SMALL = 'openweave:nudge-small'
const NUDGE_STORAGE_KEY_BIG = 'openweave:nudge-big'

function loadNudgeSettings(): NudgeSettings {
  if (typeof window === 'undefined') return { small: 1, big: 10 }
  const smallRaw = window.localStorage.getItem(NUDGE_STORAGE_KEY_SMALL)
  const bigRaw = window.localStorage.getItem(NUDGE_STORAGE_KEY_BIG)
  const small = smallRaw ? Math.max(0.1, Number(smallRaw) || 1) : 1
  const big = bigRaw ? Math.max(1, Number(bigRaw) || 10) : 10
  return { small, big }
}

export const nudgeSettings = atom<NudgeSettings>(loadNudgeSettings())

export function setNudgeSettings(settings: Partial<NudgeSettings>) {
  const current = nudgeSettings.get()
  const next: NudgeSettings = {
    small: settings.small !== undefined ? Math.max(0.1, settings.small) : current.small,
    big: settings.big !== undefined ? Math.max(1, settings.big) : current.big
  }
  nudgeSettings.set(next)
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(NUDGE_STORAGE_KEY_SMALL, String(next.small))
    window.localStorage.setItem(NUDGE_STORAGE_KEY_BIG, String(next.big))
  }
}
