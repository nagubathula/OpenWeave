import { useState } from 'react'

import type { CredentialStatus } from '@/app/settings/credentials/types'

export const settingsInputClass =
  'w-full rounded border border-border bg-input px-2 py-1 text-xs text-surface outline-none focus:border-accent'

export interface CredentialKeyFieldLabels {
  label: string
  saved: string
  placeholder: string
  savedPlaceholder: string
  save: string
  clear: string
  getKey: string
}

export interface CredentialKeyFieldProps {
  labels: CredentialKeyFieldLabels
  status: CredentialStatus
  keyURL?: string
  'data-test-id'?: string
  /** Emitted with the trimmed draft when the user saves a new secret. */
  onSave: (value: string) => Promise<void>
  onClear: () => Promise<void>
}

/** Write-only secret field: shows whether a value is saved, never the value itself. */
export function CredentialKeyField({
  labels,
  status,
  keyURL,
  'data-test-id': testId,
  onSave,
  onClear
}: CredentialKeyFieldProps) {
  const [draft, setDraft] = useState('')
  const configured = status === 'configured'

  const save = async () => {
    const value = draft.trim()
    if (!value) return
    await onSave(value)
    setDraft('')
  }

  const clear = async () => {
    await onClear()
    setDraft('')
  }

  return (
    <label className="flex flex-col gap-1 text-[11px] text-muted">
      <span className="flex items-center justify-between">
        {labels.label}
        {configured && <span className="text-[10px] text-green-500">{labels.saved}</span>}
      </span>
      <input
        type="password"
        className={settingsInputClass}
        value={draft}
        data-test-id={testId}
        placeholder={configured ? labels.savedPlaceholder : labels.placeholder}
        onChange={(e) => setDraft(e.target.value)}
      />
      <div className="mt-1 flex items-center gap-2">
        <button
          type="button"
          className="rounded bg-accent px-2 py-1 text-[11px] font-medium text-white hover:bg-accent/90 disabled:opacity-50"
          disabled={!draft.trim()}
          onClick={() => void save()}
        >
          {labels.save}
        </button>
        {configured && (
          <button
            type="button"
            className="rounded border border-border px-2 py-1 text-[11px] text-muted hover:bg-hover hover:text-surface"
            onClick={() => void clear()}
          >
            {labels.clear}
          </button>
        )}
        {keyURL && (
          <a
            href={keyURL}
            target="_blank"
            rel="noreferrer"
            className="ml-auto text-[10px] text-accent underline"
          >
            {labels.getKey}
          </a>
        )}
      </div>
    </label>
  )
}
