import { useCallback, useEffect, useState } from 'react'

import type {
  FontFamilyOption,
  LocalFontAccessState,
  WebFontProviderId
} from '@openweave/core/text'
import { useI18n } from '@openweave/react'

import {
  clearDownloadedFontCache,
  downloadedFontCacheSummary,
  fontProviderSettings,
  localFontAccessState,
  onlineFontsEnabled,
  predownloadFallbackFonts,
  requestLocalFontAccess,
  type FontProviderSettings
} from '@/app/editor/fonts'
import type { DownloadedFontCacheSummary } from '@/app/editor/fonts/cache'

type FontCacheSummary = DownloadedFontCacheSummary

interface PersistedSetting<T> {
  get(): T
  set(value: T): void
  subscribe(listener: (value: T) => void): () => void
}

export interface FontSettingsActions {
  clearDownloadedFontCache: () => Promise<void>
  downloadedFontCacheSummary: () => Promise<FontCacheSummary>
  localFontAccessState: () => LocalFontAccessState
  predownloadFallbackFonts: () => Promise<unknown>
  requestLocalFontAccess: () => Promise<string[] | FontFamilyOption[]>
  onlineFontsEnabled: PersistedSetting<boolean>
  fontProviderSettings: PersistedSetting<FontProviderSettings>
}

export type FontSettingsBusyAction = 'access' | 'download' | 'clear' | 'refresh'

const defaultActions: FontSettingsActions = {
  clearDownloadedFontCache,
  downloadedFontCacheSummary,
  localFontAccessState,
  predownloadFallbackFonts,
  requestLocalFontAccess,
  onlineFontsEnabled,
  fontProviderSettings
}

export function useFontSettings(actions: FontSettingsActions = defaultActions) {
  const { dialogs } = useI18n()
  const [cacheCount, setCacheCount] = useState(0)
  const [cacheByteLength, setCacheByteLength] = useState(0)
  const [cacheUpdatedAt, setCacheUpdatedAt] = useState<number | null>(null)
  const [accessState, setAccessState] = useState(() => actions.localFontAccessState())
  const [busyAction, setBusyAction] = useState<FontSettingsBusyAction | null>(null)
  const [status, setStatus] = useState('')

  const [onlineEnabled, setOnlineEnabledState] = useState(() => actions.onlineFontsEnabled.get())
  const [providerSettings, setProviderSettingsState] = useState(() =>
    actions.fontProviderSettings.get()
  )
  useEffect(
    () => actions.onlineFontsEnabled.subscribe(setOnlineEnabledState),
    [actions.onlineFontsEnabled]
  )
  useEffect(
    () => actions.fontProviderSettings.subscribe(setProviderSettingsState),
    [actions.fontProviderSettings]
  )

  const accessStateLabel =
    accessState === 'granted'
      ? dialogs.enabled
      : accessState === 'denied'
        ? dialogs.denied
        : accessState === 'unsupported'
          ? dialogs.unavailable
          : dialogs.notRequested

  const cacheSize =
    cacheByteLength === 0 ? '0 MB' : `${(cacheByteLength / 1024 / 1024).toFixed(1)} MB`

  const cacheUpdatedLabel =
    cacheUpdatedAt === null ? dialogs.never : new Date(cacheUpdatedAt).toLocaleDateString()

  const canRequestLocalFonts = accessState === 'prompt' || accessState === 'denied'

  const refreshSummary = useCallback(async () => {
    setBusyAction((current) => current ?? 'refresh')
    try {
      const summary = await actions.downloadedFontCacheSummary()
      setCacheCount(summary.count)
      setCacheByteLength(summary.byteLength)
      setCacheUpdatedAt(summary.updatedAt)
      setAccessState(actions.localFontAccessState())
    } finally {
      setBusyAction((current) => (current === 'refresh' ? null : current))
    }
  }, [actions])

  async function requestAccess() {
    setBusyAction('access')
    setStatus('')
    try {
      await actions.requestLocalFontAccess()
      setAccessState(actions.localFontAccessState())
      setStatus(dialogs.localFontAccessEnabled)
    } catch {
      setAccessState(actions.localFontAccessState())
      setStatus(dialogs.localFontAccessNotGranted)
    } finally {
      setBusyAction(null)
    }
  }

  function setOnlineFontsEnabled(enabled: boolean) {
    actions.onlineFontsEnabled.set(enabled)
    setStatus(enabled ? dialogs.onlineFontProvidersEnabled : dialogs.onlineFontProvidersDisabled)
  }

  function setFontProviderEnabled(provider: WebFontProviderId, enabled: boolean) {
    actions.fontProviderSettings.set({ ...actions.fontProviderSettings.get(), [provider]: enabled })
    setStatus(
      enabled ? dialogs.fontProviderEnabled({ provider }) : dialogs.fontProviderDisabled({ provider })
    )
  }

  async function downloadFallbacks() {
    setBusyAction('download')
    setStatus('')
    try {
      await actions.predownloadFallbackFonts()
      await refreshSummary()
      setStatus(dialogs.fallbackFontsDownloaded)
    } catch {
      setStatus(dialogs.fallbackFontsDownloadFailed)
    } finally {
      setBusyAction(null)
    }
  }

  async function clearCache() {
    setBusyAction('clear')
    setStatus('')
    try {
      await actions.clearDownloadedFontCache()
      await refreshSummary()
      setStatus(dialogs.downloadedFontCacheCleared)
    } catch {
      setStatus(dialogs.downloadedFontCacheClearFailed)
    } finally {
      setBusyAction(null)
    }
  }

  return {
    accessState,
    accessStateLabel,
    busyAction,
    canRequestLocalFonts,
    cacheCount,
    cacheSize,
    cacheUpdatedLabel,
    status,
    onlineFontsEnabled: onlineEnabled,
    fontProviderSettings: providerSettings,
    clearCache,
    downloadFallbacks,
    refreshSummary,
    requestAccess,
    setOnlineFontsEnabled,
    setFontProviderEnabled
  }
}
