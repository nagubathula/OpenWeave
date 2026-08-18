import React, { useEffect, useState } from 'react'

import { IS_BROWSER, IS_TAURI } from '@/constants'

/**
 * Ported from src/components/SafariBanner.vue.
 *
 * Warns browsers without the File System Access API (`showSaveFilePicker`) —
 * Safari/Firefox — that saves fall back to downloads. The feature check and the
 * dismissal flag both touch `window`/`localStorage`, so they run in an effect
 * after mount to stay safe under Next's static prerender.
 */
const DISMISS_KEY = 'safari-banner-dismissed'

export default function SafariBanner() {
  // Assume dismissed/supported until mounted so the banner never flashes during
  // hydration; the effect resolves the real values on the client.
  const [dismissed, setDismissed] = useState(true)
  const [supported, setSupported] = useState(true)

  useEffect(() => {
    setDismissed(window.localStorage.getItem(DISMISS_KEY) === 'true')
    setSupported('showSaveFilePicker' in window)
  }, [])

  const show = !IS_TAURI && IS_BROWSER && !supported && !dismissed
  if (!show) return null

  const dismiss = () => {
    window.localStorage.setItem(DISMISS_KEY, 'true')
    setDismissed(true)
  }

  return (
    <div
      data-test-id="safari-banner"
      className="flex items-center gap-2 border-b border-[var(--color-warning-border)] bg-[var(--color-warning-bg)] px-3 py-1.5 text-xs text-[var(--color-warning-text)]"
    >
      <span className="flex-1">
        Your browser doesn't support the local file API. Files will be downloaded instead of saved
        in place.{' '}
        <a
          href="https://www.google.com/chrome/"
          target="_blank"
          rel="noreferrer"
          className="font-medium underline"
        >
          Use Chrome
        </a>{' '}
        or Edge for full support.
      </span>
      <button
        type="button"
        data-test-id="safari-banner-dismiss"
        className="shrink-0 rounded px-1.5 py-0.5 font-medium text-[var(--color-warning-action)] transition-colors hover:bg-amber-500/20"
        onClick={dismiss}
      >
        Dismiss
      </button>
    </div>
  )
}
