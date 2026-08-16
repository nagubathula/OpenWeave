import { atom, computed } from 'nanostores'

import { IS_TAURI } from '@openweave/core/constants'
import { setPexelsApiKey, setUnsplashAccessKey } from '@openweave/core/tools'

import {
  designCustomAPIType,
  designCustomBaseURL,
  designCustomModelID,
  designMaxOutputTokens,
  designModelConnection,
  designModelID,
  designProviderDefinition,
  designProviderID,
  modelConnectionCredentialRef
} from '@/app/ai/models'
import { appCredentialServices, browserCredentialsRemembered } from '@/app/settings/credentials/app'
import {
  initializeCredentialMigration,
  PEXELS_CREDENTIAL,
  UNSPLASH_CREDENTIAL
} from '@/app/settings/credentials/migration'
import { setAppCredentialPersistence } from '@/app/settings/credentials/persistence'
import type { CredentialRef, CredentialStatus } from '@/app/settings/credentials/types'

export const providerID = designProviderID
export const modelID = designModelID
export const customBaseURL = designCustomBaseURL
export const customModelID = designCustomModelID
export const customAPIType = designCustomAPIType
export const maxOutputTokens = designMaxOutputTokens
export const providerDef = designProviderDefinition

export const apiKeyStatus = atom<CredentialStatus>('missing')
export const pexelsKeyStatus = atom<CredentialStatus>('missing')
export const unsplashKeyStatus = atom<CredentialStatus>('missing')
const credentialRevision = atom(0)

export const isACPProvider = computed(providerID, (provider) => provider.startsWith('acp:'))

export const isConfigured = computed(
  [isACPProvider, apiKeyStatus, providerID, customBaseURL],
  (acpProvider, keyStatus, provider, baseURL) => {
    if (acpProvider) return IS_TAURI
    if (keyStatus !== 'configured') return false
    const needsBaseURL = provider === 'openai-compatible' || provider === 'anthropic-compatible'
    return !needsBaseURL || Boolean(baseURL)
  }
)

async function refreshStatus(reference: CredentialRef): Promise<CredentialStatus> {
  return appCredentialServices.manager.status(reference)
}

function designCredentialReference(): CredentialRef | null {
  const connection = designModelConnection.get()
  if (!connection || connection.providerID.startsWith('acp:')) return null
  return modelConnectionCredentialRef(connection)
}

export async function refreshAIProviderStatus(): Promise<void> {
  const reference = designCredentialReference()
  apiKeyStatus.set(reference ? await refreshStatus(reference) : 'missing')
}

async function refreshMediaCredentials(): Promise<void> {
  const [pexelsStatus, unsplashStatus] = await Promise.all([
    refreshStatus(PEXELS_CREDENTIAL),
    refreshStatus(UNSPLASH_CREDENTIAL)
  ])
  pexelsKeyStatus.set(pexelsStatus)
  unsplashKeyStatus.set(unsplashStatus)
  setPexelsApiKey(
    pexelsStatus === 'configured'
      ? await appCredentialServices.resolver.resolve(PEXELS_CREDENTIAL)
      : null
  )
  setUnsplashAccessKey(
    unsplashStatus === 'configured'
      ? await appCredentialServices.resolver.resolve(UNSPLASH_CREDENTIAL)
      : null
  )
}

export const credentialsReady = initializeCredentialMigration().then(async () => {
  await Promise.all([refreshAIProviderStatus(), refreshMediaCredentials()])
  return undefined
})

export async function resolveAPIKey(): Promise<string | null> {
  await credentialsReady
  const reference = designCredentialReference()
  return reference ? appCredentialServices.resolver.resolve(reference) : null
}

export async function setAPIKey(key: string): Promise<void> {
  const reference = designCredentialReference()
  if (!reference) return
  const value = key.trim()
  if (value) await appCredentialServices.manager.set(reference, value)
  else await appCredentialServices.manager.clear(reference)
  apiKeyStatus.set(await refreshStatus(reference))
  credentialRevision.set(credentialRevision.get() + 1)
}

export async function setPexelsKey(key: string): Promise<void> {
  const value = key.trim()
  if (value) await appCredentialServices.manager.set(PEXELS_CREDENTIAL, value)
  else await appCredentialServices.manager.clear(PEXELS_CREDENTIAL)
  pexelsKeyStatus.set(await refreshStatus(PEXELS_CREDENTIAL))
  setPexelsApiKey(value || null)
}

export async function setUnsplashKey(key: string): Promise<void> {
  const value = key.trim()
  if (value) await appCredentialServices.manager.set(UNSPLASH_CREDENTIAL, value)
  else await appCredentialServices.manager.clear(UNSPLASH_CREDENTIAL)
  unsplashKeyStatus.set(await refreshStatus(UNSPLASH_CREDENTIAL))
  setUnsplashAccessKey(value || null)
}

export async function setRememberCredentials(remembered: boolean): Promise<void> {
  await credentialsReady
  await setAppCredentialPersistence(remembered)
  await Promise.all([refreshAIProviderStatus(), refreshMediaCredentials()])
  credentialRevision.set(credentialRevision.get() + 1)
}

export { browserCredentialsRemembered }

/** Derived id so listeners fire only when the design connection actually changes. */
const designConnectionID = computed(designModelConnection, (connection) => connection?.id)

export function registerAIChatEffects(markTransportDirty: () => void) {
  // `.listen` (unlike `.subscribe`) does not fire immediately — matching the
  // lazy Vue `watch` calls this replaces.
  designConnectionID.listen(() => {
    void refreshAIProviderStatus()
    markTransportDirty()
  })
  modelID.listen(markTransportDirty)
  customModelID.listen(markTransportDirty)
  customAPIType.listen(markTransportDirty)
  customBaseURL.listen(markTransportDirty)
  maxOutputTokens.listen(markTransportDirty)
  credentialRevision.listen(markTransportDirty)
}
