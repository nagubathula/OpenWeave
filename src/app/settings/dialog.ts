import { atom } from 'nanostores'

export type SettingsSection = 'ai' | 'media' | 'storage'

export const settingsDialogOpen = atom(false)
export const settingsDialogSection = atom<SettingsSection>('ai')

export function openSettingsDialog(section: SettingsSection = 'ai'): void {
  settingsDialogSection.set(section)
  settingsDialogOpen.set(true)
}
