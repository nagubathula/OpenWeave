import { atom, computed } from 'nanostores'

import {
  AI_PROVIDERS,
  DEFAULT_AI_MODEL,
  DEFAULT_AI_PROVIDER,
  type AIProviderID
} from '@openweave/core/constants'

import {
  readAIModelSettingsStorage,
  readLegacyAIModelStorage,
  writeAIModelSettingsStorage
} from '@/app/ai/models/storage'
import type {
  AIModelCapability,
  AIModelConnection,
  AIModelProfile,
  AIModelProfileDraft,
  AIModelProfileId,
  AIModelRole,
  AIModelRoleAssignment,
  AIModelSettings,
  OptionalAIModelRole,
  ResolvedAIModelRole
} from '@/app/ai/models/types'

const LEGACY_CONNECTION_ID = 'connection-default'
const LEGACY_MODEL_ID: AIModelProfileId = 'model-default'
const DEFAULT_MAX_OUTPUT_TOKENS = 16_384

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isProviderID(value: unknown): value is AIProviderID {
  return (
    typeof value === 'string' &&
    (value.startsWith('acp:') || AI_PROVIDERS.some((provider) => provider.id === value))
  )
}

function isAPIType(value: unknown): value is 'completions' | 'responses' {
  return value === 'completions' || value === 'responses'
}

function isCapability(value: unknown): value is AIModelCapability {
  return value === 'tools' || value === 'vision'
}

function stringValue(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

function normalizedMaxOutputTokens(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.min(128_000, Math.max(1024, Math.round(value)))
    : DEFAULT_MAX_OUTPUT_TOKENS
}

function parseConnection(value: unknown): AIModelConnection | null {
  if (!isRecord(value)) return null
  const id = stringValue(value.id)
  const credentialProfileId = stringValue(value.credentialProfileId)
  if (!id || !credentialProfileId || !isProviderID(value.providerID)) return null
  return {
    id,
    providerID: value.providerID,
    customBaseURL: stringValue(value.customBaseURL),
    customAPIType: isAPIType(value.customAPIType) ? value.customAPIType : 'completions',
    credentialProfileId
  }
}

function parseProfile(value: unknown, connectionIds: Set<string>): AIModelProfile | null {
  if (!isRecord(value)) return null
  const id = stringValue(value.id)
  const connectionId = stringValue(value.connectionId)
  if (!id.startsWith('model-') || !connectionIds.has(connectionId)) return null
  const capabilities = Array.isArray(value.capabilities)
    ? value.capabilities.filter(isCapability)
    : ['tools' as const]
  return {
    id: id as AIModelProfileId,
    name: stringValue(value.name, 'Model'),
    connectionId,
    modelID: stringValue(value.modelID),
    customModelID: stringValue(value.customModelID),
    maxOutputTokens: normalizedMaxOutputTokens(value.maxOutputTokens),
    capabilities: [...new Set(capabilities)]
  }
}

function optionalAssignment(value: unknown, modelIds: Set<string>): AIModelRoleAssignment {
  if (value === 'design' || value === null) return value
  return typeof value === 'string' && modelIds.has(value) ? (value as AIModelProfileId) : null
}

function parseSettings(value: unknown): AIModelSettings | null {
  if (!isRecord(value) || value.version !== 1) return null
  const connections = Array.isArray(value.connections)
    ? value.connections.map(parseConnection).filter((connection) => connection !== null)
    : []
  const connectionIds = new Set(connections.map((connection) => connection.id))
  const models = Array.isArray(value.models)
    ? value.models
        .map((profile) => parseProfile(profile, connectionIds))
        .filter((profile) => profile !== null)
    : []
  if (!models.length) return null
  const modelIds = new Set(models.map((profile) => profile.id))
  const rawAssignments = isRecord(value.assignments) ? value.assignments : {}
  const rawDesign = stringValue(rawAssignments.design)
  const design = rawDesign.startsWith('model-') ? (rawDesign as AIModelProfileId) : models[0].id
  const resolvedDesign = modelIds.has(design) ? design : models[0].id
  const assignments: AIModelSettings['assignments'] = {
    design: resolvedDesign,
    review: optionalAssignment(rawAssignments.review, modelIds),
    fast: optionalAssignment(rawAssignments.fast, modelIds),
    vision: optionalAssignment(rawAssignments.vision, modelIds)
  }
  for (const role of ['review', 'fast', 'vision'] as const) {
    const assignment = assignments[role]
    if (assignment === null) continue
    const profileId = assignment === 'design' ? resolvedDesign : assignment
    const profile = models.find((candidate) => candidate.id === profileId)
    const connection = connections.find((candidate) => candidate.id === profile?.connectionId)
    const invalidACP = connection?.providerID.startsWith('acp:')
    const invalidVision = role === 'vision' && !profile?.capabilities.includes('vision')
    if (invalidACP || invalidVision) assignments[role] = null
  }
  return { version: 1, connections, models, assignments }
}

function legacySettings(): AIModelSettings {
  const storedProvider = readLegacyAIModelStorage('ai-provider')
  const providerID = isProviderID(storedProvider) ? storedProvider : DEFAULT_AI_PROVIDER
  const provider = AI_PROVIDERS.find((definition) => definition.id === providerID)
  const modelID = readLegacyAIModelStorage('ai-model') ?? provider?.defaultModel ?? DEFAULT_AI_MODEL
  const customModelID = readLegacyAIModelStorage('ai-custom-model') ?? ''
  const displayModel = customModelID || modelID
  const name = displayModel
    ? provider?.models.find((model) => model.id === displayModel)?.name || displayModel
    : 'Design model'
  const maxOutputTokens = Number(readLegacyAIModelStorage('ai-max-output-tokens'))
  return {
    version: 1,
    connections: [
      {
        id: LEGACY_CONNECTION_ID,
        providerID,
        customBaseURL: readLegacyAIModelStorage('ai-base-url') ?? '',
        customAPIType:
          readLegacyAIModelStorage('ai-api-type') === 'responses' ? 'responses' : 'completions',
        credentialProfileId: 'default'
      }
    ],
    models: [
      {
        id: LEGACY_MODEL_ID,
        name,
        connectionId: LEGACY_CONNECTION_ID,
        modelID,
        customModelID,
        maxOutputTokens: Number.isFinite(maxOutputTokens)
          ? maxOutputTokens
          : DEFAULT_MAX_OUTPUT_TOKENS,
        capabilities: ['tools']
      }
    ],
    assignments: {
      design: LEGACY_MODEL_ID,
      review: 'design',
      fast: 'design',
      vision: null
    }
  }
}

function loadSettings(): AIModelSettings {
  return parseSettings(readAIModelSettingsStorage()) ?? legacySettings()
}

export const aiModelSettings = atom<AIModelSettings>(loadSettings())

aiModelSettings.listen((settings) => writeAIModelSettingsStorage(settings))

/**
 * All mutations go through here: clone the current settings, apply the change,
 * publish the new object. Replaces Vue's deep-reactive mutation + deep watch —
 * nanostores atoms only notify on `.set()`, so in-place edits would be silent.
 */
function updateSettings(mutate: (settings: AIModelSettings) => void): void {
  const next = modelSettingsSnapshot()
  mutate(next)
  aiModelSettings.set(next)
}

function createConnectionId(): string {
  return `connection-${crypto.randomUUID()}`
}

function createModelId(): AIModelProfileId {
  return `model-${crypto.randomUUID()}`
}

export function modelProfile(profileId: string): AIModelProfile | null {
  return aiModelSettings.get().models.find((profile) => profile.id === profileId) ?? null
}

export function modelConnection(connectionId: string): AIModelConnection | null {
  return (
    aiModelSettings.get().connections.find((connection) => connection.id === connectionId) ?? null
  )
}

export function isDesignModelProfile(profile: AIModelProfile): boolean {
  return profile.capabilities.includes('tools')
}

export function designModelProfiles(): AIModelProfile[] {
  return aiModelSettings.get().models.filter(isDesignModelProfile)
}

export function isACPModelProfile(profile: AIModelProfile | null): boolean {
  return Boolean(profile && modelConnection(profile.connectionId)?.providerID.startsWith('acp:'))
}

export function resolveAIModelRole(role: AIModelRole): ResolvedAIModelRole | null {
  const assignment = aiModelSettings.get().assignments[role]
  if (assignment === null) return null
  const profileId = assignment === 'design' ? aiModelSettings.get().assignments.design : assignment
  const profile = modelProfile(profileId)
  if (!profile) return null
  if (role === 'design' && !isDesignModelProfile(profile)) return null
  if (role === 'vision' && !profile.capabilities.includes('vision')) return null
  const connection = modelConnection(profile.connectionId)
  return connection ? { requestedRole: role, profile, connection } : null
}

function connectionMatchesDraft(
  connection: AIModelConnection,
  draft: AIModelProfileDraft
): boolean {
  return (
    connection.providerID === draft.providerID &&
    connection.customBaseURL === draft.customBaseURL.trim() &&
    connection.customAPIType === draft.customAPIType
  )
}

function findConnectionForDraftIn(
  settings: AIModelSettings,
  draft: AIModelProfileDraft
): AIModelConnection | null {
  const source = draft.sourceConnectionId
    ? (settings.connections.find((connection) => connection.id === draft.sourceConnectionId) ??
      null)
    : null
  if (source && connectionMatchesDraft(source, draft)) return source
  return (
    settings.connections.find((connection) => connectionMatchesDraft(connection, draft)) ?? null
  )
}

export function findModelConnectionForDraft(draft: AIModelProfileDraft): AIModelConnection | null {
  return findConnectionForDraftIn(aiModelSettings.get(), draft)
}

/** Finds a matching connection inside `settings` or creates and appends one. */
function connectionForDraft(
  settings: AIModelSettings,
  draft: AIModelProfileDraft
): AIModelConnection {
  const existing = findConnectionForDraftIn(settings, draft)
  if (existing) return existing
  const id = createConnectionId()
  const connection: AIModelConnection = {
    id,
    providerID: draft.providerID,
    customBaseURL: draft.customBaseURL.trim(),
    customAPIType: draft.customAPIType,
    credentialProfileId: id
  }
  settings.connections.push(connection)
  return connection
}

function draftForProfile(
  profile: AIModelProfile,
  connection: AIModelConnection
): AIModelProfileDraft {
  return {
    profileId: profile.id,
    sourceConnectionId: profile.connectionId,
    name: profile.name,
    providerID: connection.providerID,
    modelID: profile.modelID,
    customModelID: profile.customModelID,
    customBaseURL: connection.customBaseURL,
    customAPIType: connection.customAPIType,
    maxOutputTokens: profile.maxOutputTokens,
    capabilities: [...profile.capabilities]
  }
}

function newProfileDraft(connection: AIModelConnection | null): AIModelProfileDraft {
  const providerID = connection?.providerID ?? DEFAULT_AI_PROVIDER
  const provider = AI_PROVIDERS.find((definition) => definition.id === providerID)
  return {
    profileId: null,
    sourceConnectionId: connection?.id ?? null,
    name: '',
    providerID,
    modelID: provider?.defaultModel ?? '',
    customModelID: '',
    customBaseURL: connection?.customBaseURL ?? '',
    customAPIType: connection?.customAPIType ?? 'completions',
    maxOutputTokens: DEFAULT_MAX_OUTPUT_TOKENS,
    capabilities: ['tools']
  }
}

export function createModelProfileDraft(profileId?: string): AIModelProfileDraft {
  const profile = profileId ? modelProfile(profileId) : null
  const profileConnection = profile ? modelConnection(profile.connectionId) : null
  if (profile && profileConnection) return draftForProfile(profile, profileConnection)
  const designConnection = resolveAIModelRole('design')?.connection ?? null
  return newProfileDraft(designConnection ?? aiModelSettings.get().connections[0])
}

export function saveModelProfileDraft(draft: AIModelProfileDraft): AIModelProfile {
  const provider = AI_PROVIDERS.find((definition) => definition.id === draft.providerID)
  const effectiveModel = draft.customModelID.trim() || draft.modelID.trim()
  if (!draft.name.trim()) throw new Error('Model name is required')
  if (!draft.providerID.startsWith('acp:') && !effectiveModel) {
    throw new Error('Model ID is required')
  }
  if (
    draft.profileId === aiModelSettings.get().assignments.design &&
    !draft.capabilities.includes('tools')
  ) {
    throw new Error('The Design model must support tools')
  }
  const next = modelSettingsSnapshot()
  const connection = connectionForDraft(next, draft)
  const profile: AIModelProfile = {
    id: draft.profileId ?? createModelId(),
    name: draft.name.trim(),
    connectionId: connection.id,
    modelID: draft.modelID.trim() || provider?.defaultModel || '',
    customModelID: draft.customModelID.trim(),
    maxOutputTokens: normalizedMaxOutputTokens(draft.maxOutputTokens),
    capabilities: [...new Set(draft.capabilities)]
  }
  const index = next.models.findIndex((model) => model.id === profile.id)
  if (index === -1) next.models.push(profile)
  else next.models[index] = profile
  if (next.assignments.vision === profile.id && !profile.capabilities.includes('vision')) {
    next.assignments.vision = null
  }
  aiModelSettings.set(next)
  return profile
}

export function modelConnectionUsageCount(connectionId: string): number {
  return aiModelSettings.get().models.filter((profile) => profile.connectionId === connectionId)
    .length
}

export function removeModelProfile(profileId: string): void {
  const current = aiModelSettings.get()
  if (current.models.length <= 1) return
  const removesDesignAssignment = current.assignments.design === profileId
  const fallback = current.models.find(
    (profile) => profile.id !== profileId && isDesignModelProfile(profile)
  )
  if (removesDesignAssignment && !fallback) return

  const removed = modelProfile(profileId)
  updateSettings((settings) => {
    settings.models = settings.models.filter((profile) => profile.id !== profileId)
    if (removesDesignAssignment && fallback) {
      settings.assignments.design = fallback.id
      if (settings.assignments.vision === 'design' && !fallback.capabilities.includes('vision')) {
        settings.assignments.vision = null
      }
    }
    for (const role of ['review', 'fast', 'vision'] as const) {
      if (settings.assignments[role] === profileId) {
        settings.assignments[role] = null
      }
    }
    const connectionInUse =
      removed && settings.models.some((profile) => profile.connectionId === removed.connectionId)
    if (removed && !connectionInUse) {
      settings.connections = settings.connections.filter(
        (connection) => connection.id !== removed.connectionId
      )
    }
  })
}

export function setModelRoleAssignment(role: 'design', assignment: AIModelProfileId): void
export function setModelRoleAssignment(
  role: OptionalAIModelRole,
  assignment: AIModelRoleAssignment
): void
export function setModelRoleAssignment(role: AIModelRole, assignment: AIModelRoleAssignment): void {
  if (role === 'design') {
    if (assignment === null || assignment === 'design') return
    const profile = modelProfile(assignment)
    if (!profile || !isDesignModelProfile(profile)) return
    updateSettings((settings) => {
      settings.assignments.design = assignment
    })
    return
  }
  if (assignment !== null && assignment !== 'design' && !modelProfile(assignment)) return
  if (assignment !== null) {
    const profile =
      assignment === 'design'
        ? modelProfile(aiModelSettings.get().assignments.design)
        : modelProfile(assignment)
    if (isACPModelProfile(profile)) return
    if (role === 'vision' && !profile?.capabilities.includes('vision')) return
  }
  updateSettings((settings) => {
    settings.assignments[role] = assignment
  })
}

export function replaceAIModelSettings(settings: AIModelSettings): void {
  aiModelSettings.set(structuredClone(settings))
}

export const designModelProfile = computed(
  aiModelSettings,
  () => resolveAIModelRole('design')?.profile ?? null
)
export const designModelConnection = computed(
  aiModelSettings,
  () => resolveAIModelRole('design')?.connection ?? null
)
export const designProviderID = computed(
  designModelConnection,
  (connection): AIProviderID => connection?.providerID ?? DEFAULT_AI_PROVIDER
)
export const designProviderDefinition = computed(
  designProviderID,
  (providerID) => AI_PROVIDERS.find((provider) => provider.id === providerID) ?? AI_PROVIDERS[0]
)
export const designModelID = computed(designModelProfile, (profile) => profile?.modelID ?? '')
export const designCustomModelID = computed(
  designModelProfile,
  (profile) => profile?.customModelID ?? ''
)
export const designCustomBaseURL = computed(
  designModelConnection,
  (connection) => connection?.customBaseURL ?? ''
)
export const designCustomAPIType = computed(
  designModelConnection,
  (connection): 'completions' | 'responses' => connection?.customAPIType ?? 'completions'
)
export const designMaxOutputTokens = computed(
  designModelProfile,
  (profile) => profile?.maxOutputTokens ?? DEFAULT_MAX_OUTPUT_TOKENS
)

/** Setter half of the old `designModelID` writable computed. */
export function setDesignModelID(modelID: string): void {
  const profile = designModelProfile.get()
  if (!profile) return
  updateSettings((settings) => {
    const target = settings.models.find((candidate) => candidate.id === profile.id)
    if (target) target.modelID = modelID
  })
}

export function modelSettingsSnapshot(): AIModelSettings {
  const settings = aiModelSettings.get()
  return {
    version: 1,
    connections: settings.connections.map((connection) => ({ ...connection })),
    models: settings.models.map((profile) => ({
      ...profile,
      capabilities: [...profile.capabilities]
    })),
    assignments: { ...settings.assignments }
  }
}
