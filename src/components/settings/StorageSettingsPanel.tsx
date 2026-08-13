import React, { useCallback, useEffect, useState } from 'react'

import { useI18n } from '@openweave/react'

import {
  activeStorageProviderID,
  createActiveStorageAdapter,
  readStoragePreferences,
  storageCredentialStatuses,
  storagePreferencesComplete,
  storageProviderRegistry
} from '@/app/integrations/storage'
import { writeStoragePreference } from '@/app/integrations/storage'
import {
  buildCorsConfigurationJson,
  collectCloudCorsOrigins
} from '@/app/integrations/storage/s3/cors'
import { appCredentialServices } from '@/app/settings/credentials/app'
import { credentialRef } from '@/app/settings/credentials/reference'
import type { CredentialStatus } from '@/app/settings/credentials/types'
import { resumeStorageSync } from '@/app/storage/sync'
import { openStorageWorkspace } from '@/components/storage/StorageWorkspace'

const inputClass =
  'w-full rounded border border-border bg-input px-2 py-1 text-xs text-surface outline-none focus:border-accent'

/**
 * Cloud storage (S3-compatible) configuration. Ported from
 * settings/storage/StorageSettingsPanel.vue; the vue-router /storage push is
 * replaced by openStorageWorkspace().
 */
export default function StorageSettingsPanel({ onClose }: { onClose: () => void }) {
  const { dialogs } = useI18n()
  const provider = storageProviderRegistry.get(activeStorageProviderID.value)

  const [preferenceDrafts, setPreferenceDrafts] = useState<Record<string, string>>(() => ({
    ...readStoragePreferences(provider.id)
  }))
  const [credentialDrafts, setCredentialDrafts] = useState<Record<string, string>>({})
  const [credentialStatuses, setCredentialStatuses] = useState<Record<string, CredentialStatus>>({})
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null)

  const refreshStatuses = useCallback(async () => {
    setCredentialStatuses(await storageCredentialStatuses(provider.id))
  }, [provider.id])

  useEffect(() => {
    void refreshStatuses()
  }, [refreshStatuses])

  const configured =
    storagePreferencesComplete(provider.id) &&
    provider.credentialFields.every(
      (field) => !field.required || credentialStatuses[field.id] === 'configured'
    )

  const preferenceLabel = (field: string): string => {
    if (field === 'endpoint') return dialogs.storageEndpoint
    if (field === 'bucket') return dialogs.storageBucket
    if (field === 'region') return dialogs.storageRegion
    return field
  }

  const credentialLabel = (field: string): string => {
    if (field === 'access-key-id') return dialogs.storageAccessKeyID
    if (field === 'secret-access-key') return dialogs.storageSecretAccessKey
    return field
  }

  const savePreferences = (drafts: Record<string, string>) => {
    for (const field of provider.preferenceFields) {
      writeStoragePreference(provider.id, field.id, drafts[field.id] ?? '')
    }
    void resumeStorageSync()
  }

  const saveCredential = async (field: string, value?: string) => {
    const trimmed = (value ?? credentialDrafts[field])?.trim()
    if (!trimmed) return
    await appCredentialServices.manager.set(credentialRef(provider.id, field), trimmed)
    setCredentialDrafts((prev) => ({ ...prev, [field]: '' }))
    await refreshStatuses()
    await resumeStorageSync()
  }

  const clearCredential = async (field: string) => {
    await appCredentialServices.manager.clear(credentialRef(provider.id, field))
    setCredentialDrafts((prev) => ({ ...prev, [field]: '' }))
    await refreshStatuses()
  }

  const testConnection = async () => {
    setBusy(true)
    setResult(null)
    try {
      savePreferences(preferenceDrafts)
      for (const field of provider.credentialFields) {
        await saveCredential(field.id)
      }
      await resumeStorageSync()
      setResult(await createActiveStorageAdapter(provider.id).testConnection())
    } catch (error) {
      setResult({ ok: false, message: error instanceof Error ? error.message : String(error) })
    } finally {
      setBusy(false)
    }
  }

  const copyCors = async () => {
    await navigator.clipboard.writeText(buildCorsConfigurationJson(collectCloudCorsOrigins()))
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <section className="flex flex-col gap-3" data-test-id="settings-storage-panel">
      <div>
        <h3 className="text-xs font-semibold text-surface">{dialogs.settingsStorage}</h3>
        <p className="mt-0.5 text-[10px] text-muted">{provider.description}</p>
      </div>

      {provider.preferenceFields.map((field) => (
        <label key={field.id} className="flex flex-col gap-1 text-[10px] text-muted">
          {preferenceLabel(field.id)}
          <input
            className={inputClass}
            value={preferenceDrafts[field.id] ?? ''}
            placeholder={field.placeholder}
            onChange={(event) => {
              const drafts = { ...preferenceDrafts, [field.id]: event.target.value }
              setPreferenceDrafts(drafts)
            }}
            onBlur={() => savePreferences(preferenceDrafts)}
          />
        </label>
      ))}

      {provider.credentialFields.map((field) => (
        <div key={field.id} className="flex flex-col gap-1" data-credential={field.id}>
          <label htmlFor={`storage-${field.id}`} className="text-[10px] text-muted">
            {credentialLabel(field.id)}
          </label>
          <div className="flex gap-2">
            <input
              id={`storage-${field.id}`}
              type="password"
              aria-label={credentialLabel(field.id)}
              className={`${inputClass} min-w-0 flex-1`}
              value={credentialDrafts[field.id] ?? ''}
              placeholder={
                credentialStatuses[field.id] === 'configured'
                  ? dialogs.keySavedReplace
                  : field.placeholder
              }
              onChange={(event) =>
                setCredentialDrafts((prev) => ({ ...prev, [field.id]: event.target.value }))
              }
              onKeyDown={(event) => {
                if (event.key === 'Enter') void saveCredential(field.id)
              }}
            />
            {credentialDrafts[field.id]?.trim() ? (
              <button
                type="button"
                className="rounded bg-hover px-2 text-[10px] text-surface hover:bg-active"
                onClick={() => void saveCredential(field.id)}
              >
                {dialogs.save}
              </button>
            ) : credentialStatuses[field.id] === 'configured' ? (
              <button
                type="button"
                className="rounded px-2 text-[10px] text-muted hover:bg-hover hover:text-surface"
                onClick={() => void clearCredential(field.id)}
              >
                {dialogs.clear}
              </button>
            ) : null}
          </div>
        </div>
      ))}

      <button
        type="button"
        className="mt-1 rounded bg-accent px-3 py-1.5 text-[11px] font-medium text-white hover:bg-accent/90 disabled:opacity-50"
        disabled={busy}
        data-test-id="settings-storage-test"
        onClick={() => void testConnection()}
      >
        {dialogs.testConnection}
      </button>

      {provider.id === 's3-compatible' && (
        <button
          type="button"
          className="rounded px-3 py-1.5 text-[11px] text-muted hover:bg-hover hover:text-surface"
          onClick={() => void copyCors()}
        >
          {copied ? dialogs.copied : dialogs.copyStorageCors}
        </button>
      )}

      <button
        type="button"
        className="rounded border border-border px-3 py-1.5 text-[11px] font-medium text-surface hover:bg-hover disabled:text-muted disabled:opacity-50"
        disabled={!configured}
        data-test-id="settings-storage-open-workspace"
        onClick={() => {
          onClose()
          openStorageWorkspace()
        }}
      >
        {dialogs.openStorageWorkspace}
      </button>

      {result && (
        <p
          className="rounded border border-border bg-panel px-2 py-1.5 text-[10px] text-muted data-[state=error]:text-danger data-[state=success]:text-success"
          data-state={result.ok ? 'success' : 'error'}
          role="status"
        >
          {result.message}
        </p>
      )}
    </section>
  )
}
