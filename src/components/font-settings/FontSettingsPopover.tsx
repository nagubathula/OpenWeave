import * as Popover from '@radix-ui/react-popover'
import { Settings, Type } from 'lucide-react'
import React, { useEffect, useState } from 'react'

import { WEB_FONT_PROVIDER_IDS, WEB_FONT_PROVIDER_LABELS } from '@openweave/core/text'
import type { WebFontProviderId } from '@openweave/core/text'
import { useI18n } from '@openweave/react'

import { isTauri } from '@/app/tauri/env'
import { useFontSettings } from '@/components/font-settings/use'
import { useButtonUI } from '@/components/ui/button'
import { usePopoverUI } from '@/components/ui/popover'
import Tip from '@/components/ui/Tip'

const showDownloadedFonts = isTauri()

/**
 * Popover for local/online font access and (desktop-only) downloaded font
 * cache management. Ported from src/components/FontSettings/FontSettingsPopover.vue.
 */
export default function FontSettingsPopover() {
  const { dialogs } = useI18n()
  const [open, setOpen] = useState(false)

  const trigger = useButtonUI({ tone: 'ghost', size: 'iconSm', ui: { base: 'shrink-0' } })
  const secondaryButton = useButtonUI({
    tone: 'ghost',
    size: 'sm',
    ui: {
      base: 'w-full bg-input px-2 py-1.5 text-[10px] font-medium text-surface hover:bg-hover disabled:opacity-50'
    }
  })
  const primaryButton = useButtonUI({
    tone: 'accent',
    size: 'sm',
    ui: { base: 'w-full px-2 py-1.5 text-[10px] font-medium disabled:opacity-50' }
  })
  const popoverCls = usePopoverUI({ content: 'isolate z-[51] w-80 p-3' })

  const {
    accessState,
    accessStateLabel,
    busyAction,
    cacheCount,
    cacheSize,
    cacheUpdatedLabel,
    canRequestLocalFonts,
    status,
    onlineFontsEnabled,
    fontProviderSettings,
    clearCache,
    downloadFallbacks,
    refreshSummary,
    requestAccess,
    setFontProviderEnabled,
    setOnlineFontsEnabled
  } = useFontSettings()

  useEffect(() => {
    void refreshSummary()
    // Refresh once on mount only, matching the old popover's onMounted hook.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function setPopoverOpen(value: boolean) {
    setOpen(value)
    if (value) void refreshSummary()
  }

  function isProviderEnabled(provider: WebFontProviderId) {
    return fontProviderSettings[provider]
  }

  return (
    <Popover.Root open={open} onOpenChange={setPopoverOpen}>
      <Tip label={dialogs.fontSettings} disabled={open}>
        <Popover.Trigger
          type="button"
          data-test-id="font-settings-trigger"
          aria-label={dialogs.fontSettings}
          className={trigger.base}
        >
          <Settings className="size-3.5" />
        </Popover.Trigger>
      </Tip>

      <Popover.Portal>
        <Popover.Content
          data-test-id="font-settings-panel"
          side="left"
          sideOffset={8}
          align="start"
          collisionPadding={16}
          avoidCollisions
          className={popoverCls.content}
        >
          <div className="flex flex-col gap-3">
            <div className="flex items-start gap-2">
              <div className="flex size-8 shrink-0 items-center justify-center rounded bg-input text-muted">
                <Type className="size-4" />
              </div>
              <div>
                <h3 className="text-[11px] font-semibold text-surface">{dialogs.fontSettings}</h3>
                <p className="mt-0.5 text-[10px] leading-relaxed text-muted">
                  {showDownloadedFonts
                    ? dialogs.fontSettingsDesktopDescription
                    : dialogs.fontSettingsBrowserDescription}
                </p>
              </div>
            </div>

            <div className="grid gap-1.5 rounded border border-border bg-input/40 p-2 text-[10px]">
              <div className="flex justify-between gap-3 text-muted">
                <span>{dialogs.localFonts}</span>
                <span className="text-surface">{accessStateLabel}</span>
              </div>
              <div className="flex justify-between gap-3 text-muted">
                <span>{dialogs.onlineFonts}</span>
                <span className="text-surface">
                  {onlineFontsEnabled ? dialogs.enabled : dialogs.disabled}
                </span>
              </div>
              {showDownloadedFonts ? (
                <div className="flex justify-between gap-3 text-muted">
                  <span>{dialogs.downloadedCache}</span>
                  <span className="text-surface">
                    {cacheCount} fonts · {cacheSize}
                  </span>
                </div>
              ) : null}
              {showDownloadedFonts ? (
                <div className="flex justify-between gap-3 text-muted">
                  <span>{dialogs.lastUpdated}</span>
                  <span className="text-surface">{cacheUpdatedLabel}</span>
                </div>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <div className="grid grid-cols-[1fr_auto] gap-2 rounded border border-border p-2">
                <div>
                  <p className="text-[10px] font-medium text-surface">{dialogs.systemFontAccess}</p>
                  <p className="mt-0.5 text-[10px] leading-relaxed text-muted">
                    {accessState === 'granted'
                      ? dialogs.systemFontsAvailable
                      : dialogs.allowBrowserFontAccess}
                  </p>
                </div>
                <button
                  type="button"
                  data-test-id="font-settings-request-access"
                  className={secondaryButton.base}
                  disabled={busyAction !== null || !canRequestLocalFonts}
                  onClick={() => void requestAccess()}
                >
                  {busyAction === 'access' ? dialogs.requesting : dialogs.allow}
                </button>
              </div>

              <div className="grid gap-2 rounded border border-border p-2">
                <div className="grid grid-cols-[1fr_auto] gap-2">
                  <div>
                    <p className="text-[10px] font-medium text-surface">
                      {dialogs.onlineFontProviders}
                    </p>
                    <p className="mt-0.5 text-[10px] leading-relaxed text-muted">
                      {dialogs.downloadMissingWebFonts}
                    </p>
                  </div>
                  <button
                    type="button"
                    data-test-id="font-settings-toggle-online-fonts"
                    className={secondaryButton.base}
                    disabled={busyAction !== null}
                    onClick={() => setOnlineFontsEnabled(!onlineFontsEnabled)}
                  >
                    {onlineFontsEnabled ? dialogs.disable : dialogs.enable}
                  </button>
                </div>

                <div className="grid gap-1 border-t border-border pt-2">
                  {WEB_FONT_PROVIDER_IDS.map((provider) => (
                    <label
                      key={provider}
                      className="flex items-center justify-between gap-2 text-[10px] text-muted"
                    >
                      <span>{WEB_FONT_PROVIDER_LABELS[provider]}</span>
                      <input
                        type="checkbox"
                        className="size-3 accent-accent disabled:opacity-50"
                        checked={isProviderEnabled(provider)}
                        disabled={busyAction !== null || !onlineFontsEnabled}
                        data-test-id={`font-settings-provider-${provider}`}
                        onChange={(e) => setFontProviderEnabled(provider, e.target.checked)}
                      />
                    </label>
                  ))}
                </div>
              </div>

              {showDownloadedFonts ? (
                <div className="grid grid-cols-[1fr_auto] gap-2 rounded border border-border p-2">
                  <div>
                    <p className="text-[10px] font-medium text-surface">{dialogs.fallbackPacks}</p>
                    <p className="mt-0.5 text-[10px] leading-relaxed text-muted">
                      {dialogs.downloadFallbackPacksDescription}
                    </p>
                  </div>
                  <button
                    type="button"
                    data-test-id="font-settings-download-fallbacks"
                    className={primaryButton.base}
                    disabled={busyAction !== null}
                    onClick={() => void downloadFallbacks()}
                  >
                    {busyAction === 'download' ? dialogs.downloading : dialogs.download}
                  </button>
                </div>
              ) : null}
            </div>

            {showDownloadedFonts ? (
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  data-test-id="font-settings-refresh-cache"
                  className={secondaryButton.base}
                  disabled={busyAction !== null}
                  onClick={() => void refreshSummary()}
                >
                  {dialogs.refresh}
                </button>
                <button
                  type="button"
                  data-test-id="font-settings-clear-cache"
                  className={secondaryButton.base}
                  disabled={busyAction !== null || cacheCount === 0}
                  onClick={() => void clearCache()}
                >
                  {dialogs.clearCache}
                </button>
              </div>
            ) : null}

            {status ? (
              <p className="rounded bg-input px-2 py-1.5 text-[10px] leading-relaxed text-muted">
                {status}
              </p>
            ) : null}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
