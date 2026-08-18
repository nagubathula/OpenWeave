import { persistentAtom } from '@nanostores/persistent'
import { atom, computed } from 'nanostores'

import type { RulerTheme } from '@openweave/core/canvas'
import { parseColor } from '@openweave/core/color'
import { IS_BROWSER } from '@openweave/core/constants'

import { getActiveEditorStoreOrNull } from '@/app/editor/active-store'

export type AppTheme = 'dark' | 'light' | 'auto'

const THEME_STORAGE_KEY = 'openweave:theme'
const DEFAULT_THEME: AppTheme = 'dark'

export const theme = persistentAtom<AppTheme>(THEME_STORAGE_KEY, DEFAULT_THEME, {
  encode: (value) => value,
  decode: (raw) => (raw === 'light' || raw === 'auto' ? raw : 'dark')
})

const prefersDark = atom(
  IS_BROWSER ? window.matchMedia('(prefers-color-scheme: dark)').matches : true
)
if (IS_BROWSER) {
  window
    .matchMedia('(prefers-color-scheme: dark)')
    .addEventListener('change', (event) => prefersDark.set(event.matches))
}

export const resolvedTheme = computed([theme, prefersDark], (setting, dark): 'dark' | 'light' => {
  if (setting === 'auto') return dark ? 'dark' : 'light'
  return setting
})

export const isLight = computed(resolvedTheme, (value) => value === 'light')

function readRulerTheme(): RulerTheme | null {
  if (!IS_BROWSER || !('document' in globalThis)) return null
  const style = getComputedStyle(document.documentElement)
  return {
    background: parseColor(style.getPropertyValue('--color-ruler-bg')),
    tick: parseColor(style.getPropertyValue('--color-ruler-tick')),
    text: parseColor(style.getPropertyValue('--color-ruler-text')),
    label: parseColor(style.getPropertyValue('--color-ruler-label'))
  }
}

function updateCanvasTheme(): void {
  if (!IS_BROWSER) return
  const store = getActiveEditorStoreOrNull()
  if (!store) return
  store.state.rulerTheme = readRulerTheme() ?? undefined
  store.requestRepaint()
}

function applyTheme(value: 'dark' | 'light', setting: AppTheme): void {
  if (!IS_BROWSER || !('document' in globalThis)) return
  document.documentElement.dataset.theme = value
  document.documentElement.dataset.themeSetting = setting
  document.documentElement.style.colorScheme = value
  updateCanvasTheme()
}

// Applied once at module load and again on every change — the old Vue
// `watch(..., { immediate: true })` behavior.
if (IS_BROWSER) {
  applyTheme(resolvedTheme.get(), theme.get())
  resolvedTheme.listen((value) => applyTheme(value, theme.get()))
  theme.listen((setting) => applyTheme(resolvedTheme.get(), setting))
}

export function setTheme(value: AppTheme): void {
  theme.set(value)
}

export function toggleTheme(): void {
  theme.set(isLight.get() ? 'dark' : 'light')
}

export function useAppTheme() {
  return { theme, resolvedTheme, isLight, setTheme, toggleTheme }
}

if (IS_BROWSER) {
  ;(window as any).__setAppTheme = (t: AppTheme) => theme.set(t)
}
