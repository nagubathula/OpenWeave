import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Sparkles, Palette, Cloud, X, Wand2 } from 'lucide-react'
import {
  AI_PROVIDERS,
  DEFAULT_AI_PROVIDER,
  type AIProviderDef,
  type AIProviderID
} from '@openweave/core/constants'
import {
  aiModelSettings,
  replaceAIModelSettings,
  resolveAIModelRole
} from '@/app/ai/models/store'
import type {
  AIModelConnection,
  AIModelProfile,
  AIModelProfileId,
  AIModelSettings
} from '@/app/ai/models/types'
import { appCredentialServices } from '@/app/settings/credentials/app'
import { providerCredentialRef } from '@/app/settings/credentials/migration'
import {
  setVectorizeCredential,
  vectorizeCredentialStatus,
  vectorizeProviderID,
  VECTORIZE_PROVIDER_DEFINITIONS
} from '@/app/editor/vectorize'
import type { VectorizeProviderID } from '@/app/editor/vectorize'

type SettingsSection = 'ai' | 'models' | 'vectorize' | 'appearance' | 'storage'
type ThemeSetting = 'light' | 'dark' | 'auto'

const THEME_STORAGE_KEY = 'openweave:theme'
const DEFAULT_CREDENTIAL_PROFILE = 'default'
const DEFAULT_MAX_OUTPUT_TOKENS = 16_384

const DIRECT_PROVIDERS: AIProviderDef[] = AI_PROVIDERS.filter(
  (provider) => !provider.id.startsWith('acp:')
)

function findProvider(id: AIProviderID): AIProviderDef {
  return AI_PROVIDERS.find((provider) => provider.id === id) ?? AI_PROVIDERS[0]
}

// --- Theme -----------------------------------------------------------------

function prefersDark(): boolean {
  return (
    'matchMedia' in globalThis &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
  )
}

function readThemeSetting(): ThemeSetting {
  const stored = window.localStorage.getItem(THEME_STORAGE_KEY)
  if (stored === 'light' || stored === 'dark' || stored === 'auto') return stored
  const active = document.documentElement.dataset.themeSetting
  if (active === 'light' || active === 'dark' || active === 'auto') return active
  return 'dark'
}

function applyThemeSetting(setting: ThemeSetting): void {
  const resolved: 'dark' | 'light' =
    setting === 'auto' ? (prefersDark() ? 'dark' : 'light') : setting
  const root = document.documentElement
  root.dataset.theme = resolved
  root.dataset.themeSetting = setting
  root.style.colorScheme = resolved
  window.localStorage.setItem(THEME_STORAGE_KEY, setting)
}

// --- AI settings -----------------------------------------------------------

type AIFormState = {
  providerID: AIProviderID
  modelID: string
  customModelID: string
  customBaseURL: string
  apiKey: string
}

function currentDesignProfile(): {
  profile: AIModelProfile | null
  connection: AIModelConnection | null
} {
  const resolved = resolveAIModelRole('design')
  return { profile: resolved?.profile ?? null, connection: resolved?.connection ?? null }
}

function initialAIForm(): AIFormState {
  const { profile, connection } = currentDesignProfile()
  const providerID = connection?.providerID ?? DEFAULT_AI_PROVIDER
  const provider = findProvider(providerID)
  return {
    providerID,
    modelID: profile?.modelID || provider.defaultModel,
    customModelID: profile?.customModelID ?? '',
    customBaseURL: connection?.customBaseURL ?? '',
    apiKey: ''
  }
}

function buildDesignSettings(form: AIFormState): AIModelSettings {
  const existing = aiModelSettings.value
  const { profile, connection } = currentDesignProfile()
  const provider = findProvider(form.providerID)
  const connectionId = connection?.id ?? 'connection-design'
  const profileId: AIModelProfileId = profile?.id ?? 'model-design'
  const nextConnection: AIModelConnection = {
    id: connectionId,
    providerID: form.providerID,
    customBaseURL: form.customBaseURL.trim(),
    customAPIType: connection?.customAPIType ?? 'completions',
    credentialProfileId: connection?.credentialProfileId ?? DEFAULT_CREDENTIAL_PROFILE
  }
  const nextProfile: AIModelProfile = {
    id: profileId,
    name: profile?.name || provider.name,
    connectionId,
    modelID: form.modelID.trim() || provider.defaultModel,
    customModelID: form.customModelID.trim(),
    maxOutputTokens: profile?.maxOutputTokens ?? DEFAULT_MAX_OUTPUT_TOKENS,
    capabilities: profile?.capabilities ?? ['tools']
  }
  const otherConnections = existing.connections.filter((item) => item.id !== connectionId)
  const otherModels = existing.models.filter((item) => item.id !== profileId)
  return {
    version: 1,
    connections: [nextConnection, ...otherConnections],
    models: [nextProfile, ...otherModels],
    assignments: {
      design: profileId,
      review: existing.assignments.review ?? 'design',
      fast: existing.assignments.fast ?? 'design',
      vision: existing.assignments.vision
    }
  }
}

// --- Panels ----------------------------------------------------------------

const navButtonClass =
  'flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs text-muted transition-colors hover:bg-hover hover:text-surface data-[active=true]:bg-hover data-[active=true]:text-surface'

const inputClass =
  'w-full rounded border border-border bg-input px-2 py-1 text-xs text-surface outline-none focus:border-accent'

const labelClass = 'block text-[11px] font-medium text-surface'

function AppearancePanel() {
  const [theme, setTheme] = useState<ThemeSetting>(() => readThemeSetting())

  const options: { value: ThemeSetting; label: string }[] = [
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' },
    { value: 'auto', label: 'System' }
  ]

  const select = (value: ThemeSetting) => {
    setTheme(value)
    applyThemeSetting(value)
  }

  return (
    <div className="flex flex-col gap-3" data-test-id="settings-appearance-panel">
      <h3 className="text-xs font-semibold text-surface">Appearance</h3>
      <div className="flex flex-col gap-1.5">
        <span className={labelClass}>Theme</span>
        <div className="flex gap-1.5" role="radiogroup" aria-label="Theme">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={theme === option.value}
              data-active={theme === option.value}
              data-test-id={`settings-theme-${option.value}`}
              className="flex-1 rounded border border-border px-2 py-1.5 text-[11px] text-muted transition-colors hover:bg-hover hover:text-surface data-[active=true]:border-accent data-[active=true]:bg-hover data-[active=true]:text-surface"
              onClick={() => select(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function VectorizePanel() {
  const [providerID, setProviderID] = useState<VectorizeProviderID>(vectorizeProviderID.value)
  const [keyDraft, setKeyDraft] = useState('')
  const [status, setStatus] =
    useState<Awaited<ReturnType<typeof vectorizeCredentialStatus>>>('missing')

  const provider = VECTORIZE_PROVIDER_DEFINITIONS.find((definition) => definition.id === providerID)
  const configured = status === 'configured'

  useEffect(() => {
    let active = true
    void vectorizeCredentialStatus(providerID).then((next) => {
      if (active) setStatus(next)
    })
    return () => {
      active = false
    }
  }, [providerID])

  const changeProvider = (id: VectorizeProviderID) => {
    vectorizeProviderID.value = id
    setProviderID(id)
    setKeyDraft('')
  }

  const save = async () => {
    if (!keyDraft.trim()) return
    await setVectorizeCredential(providerID, keyDraft)
    setKeyDraft('')
    setStatus(await vectorizeCredentialStatus(providerID))
  }

  const clear = async () => {
    await setVectorizeCredential(providerID, '')
    setKeyDraft('')
    setStatus(await vectorizeCredentialStatus(providerID))
  }

  return (
    <div className="flex flex-col gap-3" data-test-id="settings-vectorize-panel">
      <div>
        <h3 className="text-xs font-semibold text-surface">Vectorization</h3>
        <p className="mt-0.5 text-[10px] text-muted">
          Convert raster images to editable vectors using an external provider.
        </p>
      </div>

      <label className="flex flex-col gap-1 text-[11px] text-muted">
        Provider
        <select
          className={inputClass}
          value={providerID}
          data-test-id="settings-vectorize-provider"
          onChange={(e) => changeProvider(e.target.value as VectorizeProviderID)}
        >
          {VECTORIZE_PROVIDER_DEFINITIONS.map((definition) => (
            <option key={definition.id} value={definition.id}>
              {definition.name}
            </option>
          ))}
        </select>
      </label>

      {provider && (
        <label className="flex flex-col gap-1 text-[11px] text-muted">
          <span className="flex items-center justify-between">
            API key
            {configured && <span className="text-[10px] text-green-500">Saved</span>}
          </span>
          <input
            type="password"
            className={inputClass}
            value={keyDraft}
            data-test-id="settings-vectorize-key"
            placeholder={configured ? 'Saved — enter a new key to replace' : provider.keyPlaceholder}
            onChange={(e) => setKeyDraft(e.target.value)}
          />
          <div className="mt-1 flex items-center gap-2">
            <button
              type="button"
              className="rounded bg-accent px-2 py-1 text-[11px] font-medium text-white hover:bg-accent/90 disabled:opacity-50"
              disabled={!keyDraft.trim()}
              onClick={() => void save()}
            >
              Save key
            </button>
            {configured && (
              <button
                type="button"
                className="rounded border border-border px-2 py-1 text-[11px] text-muted hover:bg-hover hover:text-surface"
                onClick={() => void clear()}
              >
                Clear
              </button>
            )}
            {provider.keyURL && (
              <a
                href={provider.keyURL}
                target="_blank"
                rel="noreferrer"
                className="ml-auto text-[10px] text-accent underline"
              >
                Get API key
              </a>
            )}
          </div>
        </label>
      )}
    </div>
  )
}

function AIPanel() {
  const [form, setForm] = useState<AIFormState>(() => initialAIForm())
  const [status, setStatus] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const provider = findProvider(form.providerID)
  const supportsCustomModel = provider.supportsCustomModel ?? false
  const supportsCustomBaseURL = provider.supportsCustomBaseURL ?? false

  useEffect(() => {
    let cancelled = false
    const reference = providerCredentialRef(form.providerID, DEFAULT_CREDENTIAL_PROFILE)
    appCredentialServices.resolver
      .resolve(reference)
      .then((value) => {
        if (!cancelled && value) setForm((prev) => ({ ...prev, apiKey: value }))
      })
      .catch(() => {
        /* credential store unavailable — leave blank */
      })
    return () => {
      cancelled = true
    }
  }, [form.providerID])

  const changeProvider = (providerID: AIProviderID) => {
    const next = findProvider(providerID)
    setForm((prev) => ({
      ...prev,
      providerID,
      modelID: next.defaultModel,
      customModelID: '',
      apiKey: ''
    }))
    setStatus(null)
  }

  const save = async () => {
    setSaving(true)
    setStatus(null)
    try {
      replaceAIModelSettings(buildDesignSettings(form))
      const key = form.apiKey.trim()
      if (key) {
        const reference = providerCredentialRef(form.providerID, DEFAULT_CREDENTIAL_PROFILE)
        await appCredentialServices.manager.set(reference, key)
      }
      setStatus('Saved')
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-3" data-test-id="settings-ai-panel">
      <h3 className="text-xs font-semibold text-surface">AI &amp; Agents</h3>

      <div className="flex flex-col gap-1">
        <label className={labelClass} htmlFor="settings-ai-provider">
          Provider
        </label>
        <select
          id="settings-ai-provider"
          className={inputClass}
          data-test-id="settings-ai-provider"
          value={form.providerID}
          onChange={(event) => changeProvider(event.target.value as AIProviderID)}
        >
          {DIRECT_PROVIDERS.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label className={labelClass} htmlFor="settings-ai-model">
          Model
        </label>
        {provider.models.length > 0 && (
          <select
            id="settings-ai-model"
            className={inputClass}
            data-test-id="settings-ai-model"
            value={form.modelID}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, modelID: event.target.value }))
            }
          >
            {provider.models.map((model) => (
              <option key={model.id} value={model.id}>
                {model.name}
              </option>
            ))}
          </select>
        )}
        {supportsCustomModel && (
          <input
            className={inputClass}
            data-test-id="settings-ai-custom-model"
            placeholder="Custom model ID (optional)"
            value={form.customModelID}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, customModelID: event.target.value }))
            }
          />
        )}
      </div>

      {supportsCustomBaseURL && (
        <div className="flex flex-col gap-1">
          <label className={labelClass} htmlFor="settings-ai-base-url">
            Base URL
          </label>
          <input
            id="settings-ai-base-url"
            className={inputClass}
            data-test-id="settings-ai-base-url"
            placeholder="https://api.example.com/v1"
            value={form.customBaseURL}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, customBaseURL: event.target.value }))
            }
          />
        </div>
      )}

      <div className="flex flex-col gap-1">
        <label className={labelClass} htmlFor="settings-ai-api-key">
          API Key
        </label>
        <input
          id="settings-ai-api-key"
          type="password"
          className={inputClass}
          data-test-id="settings-ai-api-key"
          placeholder={provider.keyPlaceholder || 'API key'}
          value={form.apiKey}
          onChange={(event) => setForm((prev) => ({ ...prev, apiKey: event.target.value }))}
        />
        {provider.keyURL && (
          <a
            href={provider.keyURL}
            target="_blank"
            rel="noreferrer"
            className="text-[10px] text-accent hover:underline"
          >
            Get an API key
          </a>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          className="rounded bg-accent px-3 py-1.5 text-[11px] font-medium text-white hover:bg-accent/90 disabled:opacity-50"
          data-test-id="settings-ai-save"
          disabled={saving}
          onClick={() => void save()}
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
        {status && (
          <span className="text-[10px] text-muted" data-test-id="settings-ai-status">
            {status}
          </span>
        )}
      </div>
    </div>
  )
}

function StoragePanel() {
  return (
    <div className="flex flex-col gap-3" data-test-id="settings-storage-panel">
      <h3 className="text-xs font-semibold text-surface">Storage</h3>
      <p className="text-[11px] text-muted">
        Documents and credentials are stored locally in your browser. Clearing site data
        removes them permanently.
      </p>
    </div>
  )
}

// --- Dialog ----------------------------------------------------------------

export interface SettingsDialogProps {
  open: boolean
  onClose: () => void
}

export function SettingsDialog({ open, onClose }: SettingsDialogProps) {
  const [section, setSection] = useState<SettingsSection>('ai')

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const nav: { id: SettingsSection; label: string; icon: React.ReactNode }[] = [
    { id: 'ai', label: 'AI & Agents', icon: <Sparkles className="size-3.5" /> },
    { id: 'vectorize', label: 'Vectorize', icon: <Wand2 className="size-3.5" /> },
    { id: 'appearance', label: 'Appearance', icon: <Palette className="size-3.5" /> },
    { id: 'storage', label: 'Storage', icon: <Cloud className="size-3.5" /> }
  ]

  // Portal to <body>: these dialogs mount inside panels that set
  // `contain: paint layout`, which makes the panel the containing block for
  // `position: fixed`, trapping the overlay inside the ~420px panel. Escaping to
  // body restores true viewport-centered full-screen behaviour.
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      data-test-id="app-settings-dialog"
      onClick={onClose}
    >
      <div
        className="flex h-[28rem] w-[40rem] max-w-[90vw] flex-col overflow-hidden rounded-lg border border-border bg-surface shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-label="Settings"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
          <h2 className="text-xs font-semibold text-surface">Settings</h2>
          <button
            type="button"
            className="flex size-6 items-center justify-center rounded text-muted hover:bg-hover hover:text-surface"
            data-test-id="app-settings-close"
            aria-label="Close"
            onClick={onClose}
          >
            <X className="size-3.5" />
          </button>
        </div>

        <div className="flex min-h-0 flex-1">
          <nav className="w-40 shrink-0 border-r border-border p-2" aria-label="Settings">
            {nav.map((item) => (
              <button
                key={item.id}
                type="button"
                className={navButtonClass}
                data-active={section === item.id}
                data-test-id={`settings-section-${item.id}`}
                onClick={() => setSection(item.id)}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </nav>

          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            {section === 'ai' && <AIPanel />}
            {section === 'vectorize' && <VectorizePanel />}
            {section === 'appearance' && <AppearancePanel />}
            {section === 'storage' && <StoragePanel />}
          </div>
        </div>

        <div className="flex justify-end border-t border-border px-4 py-2.5">
          <button
            type="button"
            className="rounded bg-accent px-3 py-1.5 text-[11px] font-medium text-white hover:bg-accent/90"
            data-test-id="app-settings-done"
            onClick={onClose}
          >
            Done
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

export default SettingsDialog
