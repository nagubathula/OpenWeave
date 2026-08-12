import React, { useEffect, useRef, useState } from 'react'
import { watch } from 'vue'

import { useI18n } from '@openweave/react'

import { getActiveEditorStore } from '@/app/editor/active-store'

/**
 * Ported from src/components/selection/RenameSelectionDialog.vue.
 *
 * Batch-rename dialog for the current selection. Open state lives on the editor
 * store (`state.renameSelectionOpen`) as a Vue ref, so we bridge it to React
 * with a `watch` and drive the modal from local state, reusing the store's
 * `previewRenameSelected`/`renameSelected` for the actual logic.
 */
export default function RenameSelectionDialog() {
  const { dialogs } = useI18n()
  const [open, setOpen] = useState(false)
  const [match, setMatch] = useState('')
  const [replacement, setReplacement] = useState('')
  const [startNumber, setStartNumber] = useState(1)
  const matchRef = useRef<HTMLInputElement>(null)
  const replacementRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const stop = watch(
      () => getActiveEditorStore().state.renameSelectionOpen,
      (isOpen) => {
        setOpen(!!isOpen)
        if (isOpen) {
          setMatch('')
          setReplacement('')
          setStartNumber(1)
          requestAnimationFrame(() => matchRef.current?.focus())
        }
      },
      { immediate: true }
    )
    return stop
  }, [])

  if (!open) return null

  const store = getActiveEditorStore()
  const selectedNodes = store.selectedNodes.value
  const options = { match, replacement, startNumber }
  const preview = store.previewRenameSelected(options)
  const hasRenameInput = match.length > 0 || replacement.length > 0
  const canSubmit = hasRenameInput && preview.error === null
  const hasAscendingNumber = /\$n+/.test(replacement)
  const hasDescendingNumber = /\$N+/.test(replacement)
  const showStartNumber = hasAscendingNumber || hasDescendingNumber

  const close = () => {
    getActiveEditorStore().state.renameSelectionOpen = false
  }

  const submit = () => {
    if (!canSubmit) return
    store.renameSelected(options)
    close()
  }

  const insertToken = (token: '$&' | '$n' | '$N') => {
    const input = replacementRef.current
    const start = input?.selectionStart ?? replacement.length
    const end = input?.selectionEnd ?? start
    const next = replacement.slice(0, start) + token + replacement.slice(end)
    setReplacement(next)
    requestAnimationFrame(() => {
      input?.focus()
      input?.setSelectionRange(start + token.length, start + token.length)
    })
  }

  const onEnter = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      submit()
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      data-test-id="rename-selection-dialog"
      onClick={close}
    >
      <div
        className="flex w-[32rem] max-w-[90vw] flex-col overflow-hidden rounded-lg border border-border bg-surface shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-label={dialogs.renameLayers({ count: String(selectedNodes.length) })}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold text-surface">
            {dialogs.renameLayers({ count: String(selectedNodes.length) })}
          </h2>
          <button
            type="button"
            className="flex size-6 cursor-pointer items-center justify-center rounded text-muted transition-colors hover:bg-hover hover:text-surface"
            aria-label={dialogs.close}
            onClick={close}
          >
            ✕
          </button>
        </div>

        <div className="px-4 py-3">
          <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-4">
            <div className="min-w-0">
              <div className="mb-1.5 text-xs text-muted">{dialogs.renamePreview}</div>
              <ul aria-label={dialogs.renamePreview} className="max-h-36 space-y-1 overflow-auto text-xs">
                {selectedNodes.map((node) => (
                  <li key={node.id} className="truncate text-surface">
                    {hasRenameInput ? (preview.names.get(node.id) ?? node.name) : node.name}
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex min-w-0 flex-col gap-2">
              <label className="flex flex-col gap-1 text-xs text-muted">
                {dialogs.renameMatch}
                <input
                  ref={matchRef}
                  value={match}
                  onChange={(e) => setMatch(e.target.value)}
                  onKeyDown={onEnter}
                  className="h-8 rounded border border-border bg-input px-2 text-sm text-surface outline-none focus:border-panel-focus"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs text-muted">
                {dialogs.renameTo}
                <input
                  ref={replacementRef}
                  value={replacement}
                  onChange={(e) => setReplacement(e.target.value)}
                  onKeyDown={onEnter}
                  className="h-8 rounded border border-border bg-input px-2 text-sm text-surface outline-none focus:border-panel-focus"
                />
              </label>
              <div className="flex flex-wrap gap-1">
                <button
                  type="button"
                  className="cursor-pointer rounded border border-border px-1.5 py-1 text-[11px] text-surface hover:bg-hover"
                  onClick={() => insertToken('$&')}
                >
                  {dialogs.renameCurrentName}
                </button>
                <button
                  type="button"
                  className="cursor-pointer rounded border border-border px-1.5 py-1 text-[11px] text-surface hover:bg-hover"
                  onClick={() => insertToken('$n')}
                >
                  {dialogs.renameNumberAscending}
                </button>
                <button
                  type="button"
                  className="cursor-pointer rounded border border-border px-1.5 py-1 text-[11px] text-surface hover:bg-hover"
                  onClick={() => insertToken('$N')}
                >
                  {dialogs.renameNumberDescending}
                </button>
              </div>
              {showStartNumber && (
                <label className="flex items-center gap-2 text-xs text-muted">
                  <span className="flex-1">
                    {hasDescendingNumber
                      ? dialogs.renameStopDescendingAt
                      : dialogs.renameStartAscendingFrom}
                  </span>
                  <input
                    type="number"
                    value={startNumber}
                    onChange={(e) => setStartNumber(Number(e.target.value))}
                    onKeyDown={onEnter}
                    className="h-8 w-16 rounded border border-border bg-input px-2 text-sm text-surface outline-none focus:border-panel-focus"
                  />
                </label>
              )}
              {preview.error && (
                <p className="text-xs text-danger" role="alert">
                  {dialogs.renameInvalidPattern}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-border px-4 py-3">
          <button
            type="button"
            className="h-8 cursor-pointer rounded px-3 text-xs font-medium text-surface hover:bg-hover"
            onClick={close}
          >
            {dialogs.cancel}
          </button>
          <button
            type="button"
            disabled={!canSubmit}
            className="h-8 cursor-pointer rounded bg-accent px-3 text-xs font-medium text-white disabled:cursor-default disabled:opacity-40"
            onClick={submit}
          >
            {dialogs.rename}
          </button>
        </div>
      </div>
    </div>
  )
}
