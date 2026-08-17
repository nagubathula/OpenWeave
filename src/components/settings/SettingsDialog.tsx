import React, { useEffect, useState, useCallback } from 'react'
import { useStore } from '@nanostores/react'
import { createPortal } from 'react-dom'
import { Sparkles, Palette, Cloud, X, Wand2 } from 'lucide-react'
import { useI18n } from '@openweave/react'
import { useEventListener } from 'usehooks-ts'

import { browserCredentialsRemembered, setRememberCredentials } from '@/app/ai/chat/storage'
import { settingsDialogSection } from '@/app/settings/dialog'
import { appCredentialServices } from '@/app/settings/credentials/app'
import ModelsPanel from '@/components/settings/models/ModelsPanel'
import StorageSettingsPanel from '@/components/settings/StorageSettingsPanel'
import { AppSwitch } from '@/components/ui/AppSwitch'
import { IS_TAURI } from '@/constants'
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

// --- Panels ----------------------------------------------------------------

const navButtonClass =
  'flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs text-muted transition-colors hover:bg-hover hover:text-surface data-[active=true]:bg-hover data-[active=true]:text-surface'

const inputClass =
  'w-full rounded border border-border bg-input px-2 py-1 text-xs text-surface outline-none focus:border-accent'

const labelClass = 'block text-[11px] font-medium text-surface'

function AppearancePanel() {
  const { dialogs } = useI18n()
  const [theme, setTheme] = useState<ThemeSetting>(() => readThemeSetting())

  const options: { value: ThemeSetting; label: string }[] = [
    { value: 'light', label: dialogs.settingsThemeLight },
    { value: 'dark', label: dialogs.settingsThemeDark },
    { value: 'auto', label: dialogs.settingsThemeSystem }
  ]

  const select = (value: ThemeSetting) => {
    setTheme(value)
    applyThemeSetting(value)
  }

  return (
    <div className="flex flex-col gap-3" data-test-id="settings-appearance-panel">
      <h3 className="text-xs font-semibold text-surface">{dialogs.settingsAppearance}</h3>
      <div className="flex flex-col gap-1.5">
        <span className={labelClass}>{dialogs.settingsTheme}</span>
        <div className="flex gap-1.5" role="radiogroup" aria-label={dialogs.settingsTheme}>
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
  const { dialogs } = useI18n()
  const providerID = useStore(vectorizeProviderID)
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
    vectorizeProviderID.set(id)
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
        <h3 className="text-xs font-semibold text-surface">{dialogs.vectorization}</h3>
        <p className="mt-0.5 text-[10px] text-muted">
          {dialogs.vectorizeProviderDescription}
        </p>
      </div>

      <label className="flex flex-col gap-1 text-[11px] text-muted">
        {dialogs.vectorizeProvider}
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
            {dialogs.vectorizeAPIKey}
            {configured && <span className="text-[10px] text-green-500">{dialogs.vectorizeSavedKey}</span>}
          </span>
          <input
            type="password"
            className={inputClass}
            value={keyDraft}
            data-test-id="settings-vectorize-key"
            placeholder={configured ? dialogs.vectorizeSavedKeyPlaceholder : provider.keyPlaceholder}
            onChange={(e) => setKeyDraft(e.target.value)}
          />
          <div className="mt-1 flex items-center gap-2">
            <button
              type="button"
              className="rounded bg-accent px-2 py-1 text-[11px] font-medium text-white hover:bg-accent/90 disabled:opacity-50"
              disabled={!keyDraft.trim()}
              onClick={() => void save()}
            >
              {dialogs.vectorizeSaveKey}
            </button>
            {configured && (
              <button
                type="button"
                className="rounded border border-border px-2 py-1 text-[11px] text-muted hover:bg-hover hover:text-surface"
                onClick={() => void clear()}
              >
                {dialogs.vectorizeClearKey}
              </button>
            )}
            {provider.keyURL && (
              <a
                href={provider.keyURL}
                target="_blank"
                rel="noreferrer"
                className="ml-auto text-[10px] text-accent underline"
              >
                {dialogs.vectorizeGetAPIKey}
              </a>
            )}
          </div>
        </label>
      )}
    </div>
  )
}



// --- Dialog ----------------------------------------------------------------

export interface SettingsDialogProps {
  open: boolean
  onClose: () => void
}

/** openSettingsDialog(section) writes a nanostores atom; map its section ids onto ours. */
function requestedSection(): SettingsSection {
  const requested = settingsDialogSection.get()
  if (requested === 'media') return 'vectorize'
  return requested
}

export function SettingsDialog({ open, onClose }: SettingsDialogProps) {
  const [section, setSection] = useState<SettingsSection>(() => requestedSection())

  // Re-sync with the requested section every time the dialog opens.
  useEffect(() => {
    if (open) setSection(requestedSection())
  }, [open])
  const { dialogs } = useI18n()

  // Remember-credentials lives in the credential store layer; local state keeps
  // the footer switch optimistic while the async persistence settles.
  const [remembered, setRemembered] = useState(() => browserCredentialsRemembered.get())
  useEffect(() => browserCredentialsRemembered.listen((value) => setRemembered(value)), [])

  const credentialBackendLabel =
    appCredentialServices.manager.backend === 'native'
      ? dialogs.credentialBackendNative
      : appCredentialServices.manager.backend === 'browser'
        ? dialogs.credentialBackendBrowser
        : dialogs.credentialBackendMemory

  const onKey = useCallback(
    (event: KeyboardEvent) => {
      if (!open) return
      if (event.key === 'Escape') onClose()
    },
    [open, onClose]
  )
  useEventListener('keydown', onKey)

  if (!open) return null

  const nav: { id: SettingsSection; label: string; icon: React.ReactNode }[] = [
    { id: 'ai', label: dialogs.settingsAIAndAgents, icon: <Sparkles className="size-3.5" /> },
    { id: 'vectorize', label: dialogs.settingsMedia, icon: <Wand2 className="size-3.5" /> },
    { id: 'appearance', label: dialogs.settingsAppearance, icon: <Palette className="size-3.5" /> },
    { id: 'storage', label: dialogs.settingsStorage, icon: <Cloud className="size-3.5" /> }
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
        aria-label={dialogs.settings}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
          <h2 className="text-xs font-semibold text-surface">{dialogs.settings}</h2>
          <button
            type="button"
            className="flex size-6 items-center justify-center rounded text-muted hover:bg-hover hover:text-surface"
            data-test-id="app-settings-close"
            aria-label={dialogs.close}
            onClick={onClose}
          >
            <X className="size-3.5" />
          </button>
        </div>

        <div className="flex min-h-0 flex-1">
          <nav className="w-40 shrink-0 border-r border-border p-2" aria-label={dialogs.settings}>
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
            {section === 'ai' && <ModelsPanel />}
            {section === 'vectorize' && <VectorizePanel />}
            {section === 'appearance' && <AppearancePanel />}
            {section === 'storage' && <StorageSettingsPanel onClose={onClose} />}
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-border px-4 py-2.5">
          <div className="mr-auto flex items-center gap-2">
            {!IS_TAURI && (
              <AppSwitch
                value={remembered}
                onValueChange={(value: boolean) => {
                  setRemembered(value)
                  void setRememberCredentials(value)
                }}
                label={dialogs.rememberCredentials}
                data-test-id="settings-remember-credentials"
              />
            )}
            <div>
              {!IS_TAURI && <p className="text-[10px] text-surface">{dialogs.rememberCredentials}</p>}
              <p className="text-[10px] text-muted" data-test-id="settings-credential-backend">
                {dialogs.credentialStorage({ backend: credentialBackendLabel })}
              </p>
            </div>
          </div>
          <button
            type="button"
            className="rounded bg-accent px-3 py-1.5 text-[11px] font-medium text-white hover:bg-accent/90"
            data-test-id="app-settings-done"
            onClick={onClose}
          >
            {dialogs.done}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

export default SettingsDialog
