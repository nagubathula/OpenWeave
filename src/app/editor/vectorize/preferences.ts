import { persistentAtom } from '@nanostores/persistent'

import { VECTORIZE_PROVIDER_IDS, type VectorizeProviderID } from '@/app/editor/vectorize/types'

function isVectorizeProviderID(value: string): value is VectorizeProviderID {
  return VECTORIZE_PROVIDER_IDS.some((providerID) => providerID === value)
}

/**
 * Persisted vectorize provider choice. Raw-string codec keeps the stored
 * format identical to the old `useLocalStorage` value; unknown ids fall back
 * to 'recraft' on read.
 */
export const vectorizeProviderID = persistentAtom<VectorizeProviderID>(
  'openweave:vectorize:provider',
  'recraft',
  {
    encode: (value) => value,
    decode: (raw) => (isVectorizeProviderID(raw) ? raw : 'recraft')
  }
)
