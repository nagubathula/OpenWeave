import { persistentAtom } from '@nanostores/persistent'

const STORAGE_PREFIX = 'openweave:'
const MODEL_SETTINGS_KEY = `${STORAGE_PREFIX}ai-model-settings`

/**
 * JSON codec matching the previous `StorageSerializers.object` behaviour;
 * unparsable storage reads as null. The missing-key default is not written
 * back (persistentAtom never writes the initial value).
 */
const modelSettings = persistentAtom<unknown>(MODEL_SETTINGS_KEY, null, {
  encode: JSON.stringify,
  decode: (raw) => {
    try {
      return JSON.parse(raw) as unknown
    } catch {
      return null
    }
  }
})

/** Raw-string codec matching `StorageSerializers.string`; read-only legacy keys. */
function legacyStringAtom(key: string) {
  return persistentAtom<string | null>(`${STORAGE_PREFIX}${key}`, null, {
    encode: (value) => value ?? '',
    decode: (raw) => raw
  })
}

const legacyValues = {
  'ai-provider': legacyStringAtom('ai-provider'),
  'ai-model': legacyStringAtom('ai-model'),
  'ai-custom-model': legacyStringAtom('ai-custom-model'),
  'ai-base-url': legacyStringAtom('ai-base-url'),
  'ai-api-type': legacyStringAtom('ai-api-type'),
  'ai-max-output-tokens': legacyStringAtom('ai-max-output-tokens')
}

export type LegacyAIModelStorageKey = keyof typeof legacyValues

export function readLegacyAIModelStorage(key: LegacyAIModelStorageKey): string | null {
  return legacyValues[key].get()
}

export function readAIModelSettingsStorage(): unknown {
  return modelSettings.get()
}

export function writeAIModelSettingsStorage(value: unknown): void {
  modelSettings.set(value)
}
