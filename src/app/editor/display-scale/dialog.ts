import { atom } from 'nanostores'

export const displayScaleDialogOpen = atom(false)

export function openDisplayScaleDialog(): void {
  displayScaleDialogOpen.set(true)
}

export function closeDisplayScaleDialog(): void {
  displayScaleDialogOpen.set(false)
}
