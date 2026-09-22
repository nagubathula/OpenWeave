import { atom } from 'nanostores'

export type HomeSection = 'recents' | 'drafts' | 'templates' | 'storage'
export type HomeViewMode = 'grid' | 'list'
export type HomeFormatFilter = 'all' | 'fig' | 'pen'

function getInitialHomeOpen(): boolean {
  if (typeof window === 'undefined') return true
  const path = window.location.pathname
  const params = new URLSearchParams(window.location.search)
  if (path.startsWith('/share') || params.has('room')) {
    return false
  }
  return true
}

export const isHomeOpen = atom<boolean>(getInitialHomeOpen())
export const homeSection = atom<HomeSection>('recents')
export const homeSearchQuery = atom<string>('')
export const homeViewMode = atom<HomeViewMode>('grid')
export const homeFormatFilter = atom<HomeFormatFilter>('all')

export function openHome(): void {
  isHomeOpen.set(true)
}

export function closeHome(): void {
  isHomeOpen.set(false)
}

export function toggleHome(): void {
  isHomeOpen.set(!isHomeOpen.get())
}
