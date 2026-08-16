import { persistentAtom } from '@nanostores/persistent'

import { storageProviderRegistry } from './providers'
import type { StorageFieldID, StorageProviderID } from './types'

export type StoragePreferences = Record<StorageProviderID, Record<StorageFieldID, string>>

/** Raw-string codec keeps parity with the old `useLocalStorage` stored value. */
export const activeStorageProviderID = persistentAtom<StorageProviderID>(
  'openweave:storage:provider',
  's3-compatible',
  {
    encode: (value) => value,
    decode: (raw) => raw as StorageProviderID
  }
)

const storedPreferences = persistentAtom<StoragePreferences>(
  'openweave:storage:preferences',
  {} as StoragePreferences,
  {
    encode: JSON.stringify,
    decode: JSON.parse
  }
)

export function readStoragePreferences(
  providerID: StorageProviderID
): Readonly<Record<StorageFieldID, string>> {
  return { ...storedPreferences.get()[providerID] }
}

export function writeStoragePreference(
  providerID: StorageProviderID,
  field: StorageFieldID,
  value: string
): void {
  const provider = storageProviderRegistry.get(providerID)
  if (!provider.preferenceFields.some((definition) => definition.id === field)) {
    throw new Error(`Unknown preference field for ${providerID}: ${field}`)
  }
  const current = storedPreferences.get()
  storedPreferences.set({
    ...current,
    [providerID]: {
      ...current[providerID],
      [field]: value.trim()
    }
  })
}

export function storagePreferencesComplete(providerID: StorageProviderID): boolean {
  const provider = storageProviderRegistry.get(providerID)
  const preferences = readStoragePreferences(providerID)
  return provider.preferenceFields.every(
    (field) => !field.required || Boolean(preferences[field.id]?.trim())
  )
}
