import React, { useCallback, useEffect, useReducer, useState } from 'react'
import * as AlertDialog from '@radix-ui/react-alert-dialog'
import { ArrowLeft, Bot, ChevronRight, Plus } from 'lucide-react'
import { watch } from 'vue'

import { useI18n } from '@openweave/react'
import { ACP_AGENTS, AI_PROVIDERS, type AIProviderID } from '@openweave/core/constants'

import { refreshAIProviderStatus } from '@/app/ai/chat/storage'
import {
  testProviderConnection,
  type ProviderConnectionTestFailureReason
} from '@/app/ai/chat/connection-test'
import {
  aiModelSettings,
  createModelProfileDraft,
  findModelConnectionForDraft,
  isACPModelProfile,
  modelConnection,
  modelConnectionCredentialStatus,
  modelConnectionUsageCount,
  modelProfile,
  removeModelProfile,
  resolveModelConnectionAPIKey,
  saveModelProfileDraft,
  setModelConnectionAPIKey,
  setModelRoleAssignment
} from '@/app/ai/models'
import type {
  AIModelCapability,
  AIModelProfileDraft,
  AIModelRole,
  OptionalAIModelRole
} from '@/app/ai/models/types'
import type { CredentialStatus } from '@/app/settings/credentials/types'
import { AppInput } from '@/components/ui/AppInput'
import { AppSelect } from '@/components/ui/AppSelect'
import { openExternalLink } from '@/app/shell/ui'
import { AppSwitch } from '@/components/ui/AppSwitch'

/**
 * AI model manager: multiple named model profiles plus per-role assignments
 * (design / review / fast / vision). Ported from the Vue
 * settings/models/{ModelsPanel,ProfileEditor,RoleAssignments}.vue
 * (`git show fe87645^:...` for the originals); the small
 * ProviderSettings* field wrappers are inlined here.
 */

const inputClass =
  'w-full rounded border border-border bg-input px-2 py-1 text-xs text-surface outline-none focus:border-accent'

function providerName(providerID: string): string {
  if (providerID.startsWith('acp:')) {
    const agentID = providerID.slice('acp:'.length)
    return ACP_AGENTS.find((agent) => agent.id === agentID)?.name ?? providerID
  }
  return AI_PROVIDERS.find((provider) => provider.id === providerID)?.name ?? providerID
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] font-medium text-surface">{label}</span>
      {children}
    </label>
  )
}

// --- Profile editor --------------------------------------------------------

interface ProfileEditorProps {
  profileId?: string
  onDone: () => void
}

function ProfileEditor({ profileId, onDone }: ProfileEditorProps) {
  const { dialogs } = useI18n()
  const [draft, setDraft] = useState<AIModelProfileDraft>(() => createModelProfileDraft(profileId))
  const [keyInput, setKeyInput] = useState('')
  const [keyStatus, setKeyStatus] = useState<CredentialStatus>('missing')
  const [saveError, setSaveError] = useState<string | null>(null)
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle')
  const [testReason, setTestReason] = useState<ProviderConnectionTestFailureReason | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const providerDef =
    AI_PROVIDERS.find((provider) => provider.id === draft.providerID) ?? AI_PROVIDERS[0]
  const isACP = draft.providerID.startsWith('acp:')
  const providerDisplayName = isACP
    ? (ACP_AGENTS.find((agent) => agent.id === draft.providerID.slice('acp:'.length))?.name ??
      draft.providerID)
    : providerDef.name
  const modelOptions = providerDef.models.map((model) => ({ value: model.id, label: model.name }))
  const activeModelId = draft.customModelID.trim() || draft.modelID
  const modelDisplayName =
    providerDef.models.find((model) => model.id === activeModelId)?.name || activeModelId
  const hasExistingKey = keyStatus === 'configured'
  const canDelete = Boolean(profileId) && aiModelSettings.value.models.length > 1
  const canSave =
    Boolean(draft.name.trim()) &&
    (isACP || Boolean(draft.customModelID.trim() || draft.modelID.trim()))
  const canTest =
    !isACP &&
    (Boolean(keyInput.trim()) || hasExistingKey) &&
    (!providerDef.supportsCustomBaseURL || Boolean(draft.customBaseURL.trim())) &&
    Boolean(draft.customModelID.trim() || draft.modelID.trim())

  const providerOptions = [
    ...AI_PROVIDERS.map((provider) => ({ value: provider.id, label: provider.name })),
    ...ACP_AGENTS.map((agent) => ({ value: `acp:${agent.id}`, label: agent.name }))
  ]

  const resetConnectionTest = () => {
    setTestStatus('idle')
    setTestReason(null)
  }

  const refreshKeyStatus = useCallback(async (current: AIModelProfileDraft) => {
    const connection = findModelConnectionForDraft(current)
    setKeyStatus(connection ? await modelConnectionCredentialStatus(connection.id) : 'missing')
  }, [])

  useEffect(() => {
    void refreshKeyStatus(draft)
    // Only on mount / provider change: key status is per-connection.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft.providerID, refreshKeyStatus])

  const setCapability = (capability: AIModelCapability, enabled: boolean) => {
    setDraft((prev) => ({
      ...prev,
      capabilities: enabled
        ? (prev.capabilities.includes(capability)
          ? prev.capabilities
          : [...prev.capabilities, capability])
        : prev.capabilities.filter((value) => value !== capability)
    }))
  }

  const updateProvider = (providerID: AIProviderID) => {
    const provider = AI_PROVIDERS.find((definition) => definition.id === providerID)
    setDraft((prev) => ({
      ...prev,
      providerID,
      sourceConnectionId: null,
      modelID: provider?.defaultModel ?? '',
      customModelID: '',
      customBaseURL: '',
      customAPIType: 'completions',
      ...(providerID.startsWith('acp:')
        ? {
            capabilities: ['tools' as const],
            name: prev.name.trim() ? prev.name : providerName(providerID)
          }
        : {})
    }))
    setKeyInput('')
    resetConnectionTest()
  }

  const updateModel = (modelID: string) => {
    setDraft((prev) => {
      const name = prev.name.trim()
        ? prev.name
        : providerDef.models.find((model) => model.id === modelID)?.name || modelID
      return { ...prev, modelID, name }
    })
    resetConnectionTest()
  }

  const save = async () => {
    setSaveError(null)
    try {
      const finalDraft = draft.name.trim()
        ? draft
        : { ...draft, name: modelDisplayName || providerDisplayName }
      const profile = saveModelProfileDraft(finalDraft)
      if (keyInput.trim()) {
        await setModelConnectionAPIKey(profile.connectionId, keyInput)
        await refreshAIProviderStatus()
        setKeyInput('')
      }
      onDone()
    } catch (reason) {
      setSaveError(reason instanceof Error ? reason.message : String(reason))
    }
  }

  const clearKey = async () => {
    const connection = findModelConnectionForDraft(draft)
    if (!connection) return
    await setModelConnectionAPIKey(connection.id, '')
    await refreshAIProviderStatus()
    setKeyInput('')
    await refreshKeyStatus(draft)
  }

  const testConnection = async () => {
    setTestStatus('testing')
    setTestReason(null)
    const connection = findModelConnectionForDraft(draft)
    const existingKey = connection ? await resolveModelConnectionAPIKey(connection.id) : null
    const result = await testProviderConnection({
      providerID: draft.providerID,
      apiKey: keyInput.trim() || existingKey || '',
      modelID: draft.modelID,
      customModelID: draft.customModelID,
      customBaseURL: draft.customBaseURL,
      customAPIType: draft.customAPIType
    })
    if (result.ok) {
      setTestStatus('success')
      return
    }
    setTestStatus('error')
    setTestReason(result.reason)
  }

  const remove = async () => {
    if (!profileId) return
    const profile = modelProfile(profileId)
    if (profile && modelConnectionUsageCount(profile.connectionId) === 1) {
      await setModelConnectionAPIKey(profile.connectionId, '')
    }
    removeModelProfile(profileId)
    await refreshAIProviderStatus()
    setDeleteOpen(false)
    onDone()
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col" data-test-id="settings-model-editor">
      <div className="flex items-center gap-2 border-b border-border pb-3">
        <button
          type="button"
          className="flex size-6 items-center justify-center rounded text-muted hover:bg-hover hover:text-surface"
          aria-label={dialogs.back}
          onClick={onDone}
        >
          <ArrowLeft className="size-3.5" />
        </button>
        <div>
          <h3 className="text-xs font-semibold text-surface">
            {profileId ? dialogs.editModel : dialogs.addModel}
          </h3>
          <p className="text-[10px] text-muted">{dialogs.modelEditorDescription}</p>
        </div>
      </div>

      <div className="scrollbar-thin flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto py-3 pr-1">
        <Field label={dialogs.modelName}>
          <AppInput
            value={draft.name}
            aria-label={dialogs.modelName}
            placeholder={modelDisplayName}
            size="sm"
            onChange={(event) => setDraft((prev) => ({ ...prev, name: event.target.value }))}
          />
        </Field>

        <Field label={dialogs.aiProvider}>
          {/* data-test-id lives on a wrapper: AppSelect spreads extra props onto
              the Radix Select.Root, which renders no DOM element. */}
          <div data-test-id="settings-model-provider">
            <AppSelect
              value={draft.providerID}
              options={providerOptions}
              label={dialogs.aiProvider}
              onValueChange={(value: string) => updateProvider(value as AIProviderID)}
            />
          </div>
        </Field>

        {!isACP && (
          <>
            {modelOptions.length > 0 && (
              <Field label={dialogs.modelID}>
                <AppSelect
                  value={draft.modelID}
                  options={modelOptions}
                  label={dialogs.modelID}
                  onValueChange={(value: string) => updateModel(value)}
                />
              </Field>
            )}

            {providerDef.supportsCustomBaseURL && (
              <Field label={dialogs.baseURL}>
                <input
                  className={inputClass}
                  value={draft.customBaseURL}
                  aria-label={dialogs.baseURL}
                  placeholder="http://localhost:11434/v1"
                  onChange={(event) => {
                    setDraft((prev) => ({ ...prev, customBaseURL: event.target.value }))
                    resetConnectionTest()
                  }}
                />
              </Field>
            )}

            {providerDef.supportsCustomModel && (
              <Field label={dialogs.modelID}>
                <input
                  className={inputClass}
                  value={draft.customModelID}
                  aria-label={dialogs.modelID}
                  data-test-id="provider-settings-custom-model"
                  placeholder="e.g. llama-3.3-70b"
                  onChange={(event) => {
                    setDraft((prev) => ({ ...prev, customModelID: event.target.value }))
                    resetConnectionTest()
                  }}
                />
              </Field>
            )}

            {draft.providerID === 'openai-compatible' && (
              <Field label={dialogs.apiType}>
                <AppSelect
                  value={draft.customAPIType}
                  label={dialogs.apiType}
                  options={[
                    { value: 'completions', label: dialogs.completions },
                    { value: 'responses', label: dialogs.responses }
                  ]}
                  onValueChange={(value: string) => {
                    setDraft((prev) => ({
                      ...prev,
                      customAPIType: value as 'completions' | 'responses'
                    }))
                    resetConnectionTest()
                  }}
                />
              </Field>
            )}

            <Field label={dialogs.maxOutputTokens}>
              <input
                className={inputClass}
                type="number"
                min={1024}
                max={128000}
                step={1024}
                value={draft.maxOutputTokens}
                aria-label={dialogs.maxOutputTokens}
                onChange={(event) =>
                  setDraft((prev) => ({ ...prev, maxOutputTokens: Number(event.target.value) }))
                }
              />
            </Field>

            <Field label={dialogs.apiKey}>
              <div className="flex items-center gap-1.5">
                <input
                  type="password"
                  data-test-id="provider-settings-api-key"
                  className={inputClass}
                  value={keyInput}
                  placeholder={hasExistingKey ? dialogs.keySavedReplace : providerDef.keyPlaceholder}
                  onChange={(event) => {
                    setKeyInput(event.target.value)
                    resetConnectionTest()
                  }}
                />
                {hasExistingKey && (
                  <button
                    type="button"
                    data-test-id="provider-settings-clear-key"
                    className="shrink-0 rounded border border-border px-2 py-1 text-[11px] text-muted hover:bg-hover hover:text-surface"
                    onClick={() => void clearKey()}
                  >
                    Clear
                  </button>
                )}
              </div>
              {providerDef.keyURL && (
                <button
                  type="button"
                  className="self-start text-left text-[11px] text-muted underline hover:text-surface"
                  onClick={() => openExternalLink(providerDef.keyURL)}
                >
                  {dialogs.getAPIKeyGeneric}
                </button>
              )}
              <div className="flex items-center justify-between">
                {hasExistingKey && (
                  <span className="text-[10px] text-green-500">{dialogs.connected}</span>
                )}
                {providerDef.keyURL && (
                  <a
                    href={providerDef.keyURL}
                    target="_blank"
                    rel="noreferrer"
                    className="ml-auto text-[10px] text-accent underline"
                  >
                    {dialogs.getAPIKeyGeneric}
                  </a>
                )}
              </div>
            </Field>

            <div className="flex items-center gap-2">
              <button
                type="button"
                className="rounded border border-border px-2.5 py-1.5 text-[11px] text-muted hover:bg-hover hover:text-surface disabled:opacity-50"
                data-test-id="provider-connection-test"
                disabled={!canTest || testStatus === 'testing'}
                onClick={() => void testConnection()}
              >
                {testStatus === 'testing' ? 'Testing…' : 'Test connection'}
              </button>
              {testStatus === 'success' && (
                <span className="text-[10px] text-green-500">Connection OK</span>
              )}
              {testStatus === 'error' && (
                <span className="text-[10px] text-danger" role="alert">
                  Failed{testReason ? `: ${testReason}` : ''}
                </span>
              )}
            </div>
          </>
        )}

        <div className="rounded border border-border p-2.5">
          <p className="mb-2 text-[11px] font-medium text-surface">{dialogs.modelCapabilities}</p>
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[11px] text-muted">{dialogs.modelCapabilityTools}</span>
              <AppSwitch
                value={draft.capabilities.includes('tools')}
                label={dialogs.modelCapabilityTools}
                onValueChange={(enabled) => setCapability('tools', enabled)}
              />
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-[11px] text-muted">{dialogs.modelCapabilityVision}</span>
              <AppSwitch
                value={draft.capabilities.includes('vision')}
                label={dialogs.modelCapabilityVision}
                onValueChange={(enabled) => setCapability('vision', enabled)}
              />
            </div>
          </div>
        </div>

        {saveError && (
          <p className="text-[10px] text-danger" role="alert">
            {saveError}
          </p>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-2 border-t border-border pt-3">
        {canDelete && (
          <button
            type="button"
            className="rounded px-2.5 py-1.5 text-[11px] text-danger hover:bg-danger/10"
            onClick={() => setDeleteOpen(true)}
          >
            {dialogs.deleteModel}
          </button>
        )}
        <button
          type="button"
          className="ml-auto rounded px-2.5 py-1.5 text-[11px] text-muted hover:bg-hover hover:text-surface"
          onClick={onDone}
        >
          {dialogs.cancel}
        </button>
        <button
          type="button"
          className="rounded bg-accent px-3 py-1.5 text-[11px] font-medium text-white hover:bg-accent/90 disabled:opacity-50"
          disabled={!canSave}
          onClick={() => void save()}
        >
          {dialogs.saveModel}
        </button>
      </div>

      <AlertDialog.Root open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
          <AlertDialog.Content
            data-test-id="delete-model-dialog"
            className="fixed top-1/2 left-1/2 z-50 w-96 max-w-[90vw] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-lg border border-border bg-surface shadow-xl"
          >
            <div className="border-b border-border px-4 py-3">
              <AlertDialog.Title className="text-sm font-semibold text-surface">
                {dialogs.deleteModel}
              </AlertDialog.Title>
            </div>
            <div className="px-4 py-3">
              <AlertDialog.Description className="text-xs text-muted">
                {dialogs.deleteModelDescription}
              </AlertDialog.Description>
            </div>
            <div className="flex justify-end gap-2 border-t border-border px-4 py-3">
              <AlertDialog.Cancel asChild>
                <button type="button" className="rounded px-3 py-1.5 text-xs text-muted hover:bg-hover">
                  {dialogs.cancel}
                </button>
              </AlertDialog.Cancel>
              <AlertDialog.Action asChild>
                <button
                  type="button"
                  className="rounded bg-danger px-3 py-1.5 text-xs text-white"
                  onClick={() => void remove()}
                >
                  {dialogs.deleteModel}
                </button>
              </AlertDialog.Action>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </div>
  )
}

// --- Role assignments ------------------------------------------------------

const SAME_AS_DESIGN = '__design__'
const NO_MODEL = '__none__'

function RoleAssignments() {
  const { dialogs } = useI18n()

  const roleDefinitions: { role: AIModelRole; label: string; description: string }[] = [
    { role: 'design', label: dialogs.modelRoleDesign, description: dialogs.modelRoleDesignDescription },
    { role: 'review', label: dialogs.modelRoleReview, description: dialogs.modelRoleReviewDescription },
    { role: 'fast', label: dialogs.modelRoleFast, description: dialogs.modelRoleFastDescription },
    { role: 'vision', label: dialogs.modelRoleVision, description: dialogs.modelRoleVisionDescription }
  ]

  const assignmentValue = (role: AIModelRole): string => {
    const assignment = aiModelSettings.value.assignments[role]
    if (assignment === null) return NO_MODEL
    return assignment === 'design' ? SAME_AS_DESIGN : assignment
  }

  const optionsForRole = (role: AIModelRole) => {
    const profiles = aiModelSettings.value.models
      .filter((profile) => {
        if (role === 'design') return profile.capabilities.includes('tools')
        if (isACPModelProfile(profile)) return false
        if (role === 'vision') return profile.capabilities.includes('vision')
        return true
      })
      .map((profile) => ({ value: profile.id, label: profile.name }))
    if (role === 'design') return profiles

    const design = modelProfile(aiModelSettings.value.assignments.design)
    const canInherit =
      !isACPModelProfile(design) && (role !== 'vision' || design?.capabilities.includes('vision'))
    return [
      ...(canInherit ? [{ value: SAME_AS_DESIGN, label: dialogs.modelRoleUseDesign }] : []),
      { value: NO_MODEL, label: dialogs.noModel },
      ...profiles
    ]
  }

  const updateAssignment = (role: AIModelRole, value: string) => {
    if (role === 'design') {
      const profile = modelProfile(value)
      if (profile) setModelRoleAssignment('design', profile.id)
      return
    }
    if (value === NO_MODEL) {
      setModelRoleAssignment(role as OptionalAIModelRole, null)
      return
    }
    if (value === SAME_AS_DESIGN) {
      setModelRoleAssignment(role as OptionalAIModelRole, 'design')
      return
    }
    const profile = modelProfile(value)
    if (profile) setModelRoleAssignment(role as OptionalAIModelRole, profile.id)
  }

  return (
    <div className="flex flex-col gap-2">
      {roleDefinitions.map((definition) => (
        <div
          key={definition.role}
          className="grid grid-cols-[10rem_minmax(0,1fr)] items-center gap-3"
          data-model-role={definition.role}
        >
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-surface">{definition.label}</p>
            <p className="text-[10px] leading-tight text-muted">{definition.description}</p>
          </div>
          <AppSelect
            value={assignmentValue(definition.role)}
            options={optionsForRole(definition.role)}
            label={definition.label}
            onValueChange={(value: string) => updateAssignment(definition.role, value)}
          />
        </div>
      ))}
    </div>
  )
}

// --- Models panel (list + editor switch) -----------------------------------

export default function ModelsPanel() {
  const { dialogs } = useI18n()
  const [, force] = useReducer((n: number): number => n + 1, 0)
  const [editing, setEditing] = useState(false)
  const [editingProfileId, setEditingProfileId] = useState<string | undefined>(undefined)
  const [statusByConnection, setStatusByConnection] = useState<Record<string, CredentialStatus>>({})

  const refreshStatuses = useCallback(async () => {
    const entries = await Promise.all(
      aiModelSettings.value.connections.map(
        async (connection) =>
          [connection.id, await modelConnectionCredentialStatus(connection.id)] as const
      )
    )
    setStatusByConnection(Object.fromEntries(entries))
  }, [])

  // aiModelSettings is a Vue ref — bridge changes (and refresh credential
  // statuses when the connection set changes).
  useEffect(() => {
    const stop = watch(
      () => aiModelSettings.value,
      () => {
        force()
        void refreshStatuses()
      },
      { deep: true, immediate: true }
    )
    return stop
  }, [refreshStatuses])

  const profiles = aiModelSettings.value.models.map((profile) => {
    const connection = modelConnection(profile.connectionId)
    const provider = AI_PROVIDERS.find((definition) => definition.id === connection?.providerID)
    const modelId = profile.customModelID || profile.modelID
    const modelName = provider?.models.find((model) => model.id === modelId)?.name || modelId
    return {
      ...profile,
      providerID: connection?.providerID ?? '',
      providerName: providerName(connection?.providerID ?? ''),
      modelName
    }
  })

  const statusLabel = (connectionId: string, providerID: string): string => {
    if (providerID.startsWith('acp:')) return dialogs.modelAgentConnection
    const status = statusByConnection[connectionId]
    if (status === 'configured') return dialogs.connected
    if (status === 'locked' || status === 'unavailable') return dialogs.unavailable
    return dialogs.modelNeedsCredential
  }

  const closeEditor = () => {
    setEditing(false)
    setEditingProfileId(undefined)
    void refreshStatuses()
  }

  if (editing) {
    return (
      <ProfileEditor
        key={editingProfileId ?? 'new'}
        profileId={editingProfileId}
        onDone={closeEditor}
      />
    )
  }

  return (
    <div className="scrollbar-thin flex min-h-0 flex-1 flex-col overflow-y-auto pr-1">
      <section>
        <div className="mb-2 flex items-center justify-between">
          <div>
            <h3 className="text-xs font-semibold text-surface">{dialogs.models}</h3>
            <p className="text-[10px] text-muted">{dialogs.modelsDescription}</p>
          </div>
          <button
            type="button"
            className="flex items-center gap-1 rounded bg-accent px-2.5 py-1.5 text-[11px] font-medium text-white hover:bg-accent/90"
            data-test-id="settings-add-model"
            onClick={() => {
              setEditingProfileId(undefined)
              setEditing(true)
            }}
          >
            <Plus className="size-3" />
            {dialogs.addModel}
          </button>
        </div>

        <div className="flex flex-col gap-1.5" data-test-id="settings-model-list">
          {profiles.map((profile) => {
            const configured = statusByConnection[profile.connectionId] === 'configured'
            return (
              <button
                key={profile.id}
                type="button"
                className="group flex items-center gap-3 rounded border border-border bg-panel-field px-3 py-2 text-left hover:border-panel-focus hover:bg-panel-field-hover"
                data-model-id={profile.id}
                onClick={() => {
                  setEditingProfileId(profile.id)
                  setEditing(true)
                }}
              >
                <div className="flex size-8 shrink-0 items-center justify-center rounded bg-panel text-muted">
                  <Bot className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[11px] font-medium text-surface">{profile.name}</p>
                  <p className="truncate text-[10px] text-muted">
                    {profile.providerName}
                    {profile.modelName ? ` · ${profile.modelName}` : ''}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <span
                    className="mr-1 flex items-center gap-1 text-[9px] text-muted"
                    data-state={configured ? 'configured' : 'missing'}
                  >
                    <span
                      className="size-1.5 rounded-full bg-muted data-[state=configured]:bg-[var(--color-success)]"
                      data-state={configured ? 'configured' : 'missing'}
                    />
                    {statusLabel(profile.connectionId, profile.providerID)}
                  </span>
                  {profile.capabilities.map((capability) => (
                    <span
                      key={capability}
                      className="rounded bg-panel px-1.5 py-0.5 text-[9px] text-muted"
                    >
                      {capability === 'tools'
                        ? dialogs.modelCapabilityToolsShort
                        : dialogs.modelCapabilityVisionShort}
                    </span>
                  ))}
                </div>
                <ChevronRight className="size-3.5 shrink-0 text-muted" />
              </button>
            )
          })}
        </div>
      </section>

      <section className="mt-5 border-t border-border pt-4">
        <div className="mb-3">
          <h3 className="text-xs font-semibold text-surface">{dialogs.modelAssignments}</h3>
          <p className="text-[10px] text-muted">{dialogs.modelAssignmentsDescription}</p>
        </div>
        <RoleAssignments />
      </section>
    </div>
  )
}
