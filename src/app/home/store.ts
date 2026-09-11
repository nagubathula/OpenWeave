import { atom } from 'nanostores'

export type HomeSection = 'recents' | 'drafts' | 'templates' | 'storage'
export type HomeViewMode = 'grid' | 'list'
export type HomeFormatFilter = 'all' | 'fig' | 'pen'

export const isHomeOpen = atom<boolean>(true)
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
