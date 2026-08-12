import React, { useEffect } from 'react'
import * as Popover from '@radix-ui/react-popover'
import { Check, ChevronDown } from 'lucide-react'

import { useFontPicker } from '@openweave/react'
import { WEB_FONT_PROVIDER_IDS } from '@openweave/core/text'

import {
  listFamilies,
  loadFont,
  localFontAccessState,
  requestLocalFontAccess
} from '@/app/editor/fonts'

/**
 * Searchable font-family picker. Ported from src/components/font-picker/FontPicker.vue.
 *
 * Uses the SDK's `useFontPicker` for the list/search/access model and renders a
 * radix popover. Each web font is loaded lazily so its row can preview in its own
 * typeface.
 */
const previewFontLoads = new Set<string>()

function loadPreviewFont(family: string, source: string) {
  if (!WEB_FONT_PROVIDER_IDS.includes(source as (typeof WEB_FONT_PROVIDER_IDS)[number])) return
  if (previewFontLoads.has(family)) return
  previewFontLoads.add(family)
  void loadFont(family)
}

export interface FontPickerProps {
  value: string
  onSelect: (family: string) => void
  label?: string
}

// The SDK's useFontPicker types `source` more narrowly ('local' | 'web' |
// 'system') than the app's FontFamilySource (which also carries web-provider
// ids). The runtime shape is identical, so bridge the function types here.
type SdkFontList = () => Promise<{ family: string; source: 'local' | 'web' | 'system' }[]>

export default function FontPicker({ value, onSelect, label = 'Font family' }: FontPickerProps) {
  const picker = useFontPicker({
    modelValue: value,
    listFamilies: listFamilies as unknown as SdkFontList,
    localFontAccess: {
      state: localFontAccessState,
      load: requestLocalFontAccess as unknown as SdkFontList
    },
    onSelect,
    onUpdateModelValue: onSelect
  })

  useEffect(() => {
    for (const option of picker.filtered) loadPreviewFont(option.family, option.source)
  }, [picker.filtered])

  return (
    <Popover.Root open={picker.open} onOpenChange={picker.setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          data-test-id="font-picker-trigger"
          aria-label={label}
          className="flex w-full items-center gap-2 rounded border border-border bg-input/50 px-2 py-1 text-xs text-surface outline-none hover:border-muted"
        >
          <span className="min-w-0 flex-1 truncate text-left">{value}</span>
          <ChevronDown className="size-3 shrink-0 text-muted" />
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={4}
          className="z-50 w-[var(--radix-popover-trigger-width)] min-w-56 overflow-hidden rounded-md border border-border bg-panel p-0 shadow-lg"
        >
          <input
            autoFocus
            value={picker.searchTerm}
            data-test-id="font-picker-search"
            placeholder="Search fonts"
            className="w-full border-b border-border bg-transparent px-3 py-2 text-sm text-surface outline-none placeholder:text-muted"
            onChange={(e) => picker.setSearchTerm(e.target.value)}
          />
          <div className="max-h-64 overflow-y-auto py-1">
            {picker.loading && (
              <div className="px-2 py-3 text-center text-xs text-muted">Loading…</div>
            )}
            {!picker.loading && picker.filtered.length === 0 && (
              <div className="px-2 py-3 text-center text-xs text-muted">
                No fonts found.
                {picker.accessState === 'prompt' && (
                  <button
                    type="button"
                    className="mt-2 block w-full rounded bg-accent px-2 py-1 text-xs font-medium text-white disabled:opacity-50"
                    disabled={picker.loading}
                    onClick={() => void picker.requestAccess()}
                  >
                    Grant font access
                  </button>
                )}
              </div>
            )}
            {picker.filtered.map((option) => {
              const selected = option.family === value
              return (
                <button
                  key={`${option.source}:${option.family}`}
                  type="button"
                  data-test-id="font-picker-item"
                  className="flex w-full min-w-0 items-center gap-2 px-3 py-2 text-sm leading-tight text-surface hover:bg-hover"
                  onClick={() => picker.select(option.family)}
                >
                  {selected ? (
                    <Check className="size-3 shrink-0 text-accent" />
                  ) : (
                    <span className="size-3 shrink-0" />
                  )}
                  <span className="truncate" style={{ fontFamily: `'${option.family}', sans-serif` }}>
                    {option.family}
                  </span>
                  <span className="ml-auto shrink-0 rounded bg-input px-1.5 py-0.5 font-sans text-[9px] uppercase text-muted">
                    {option.source}
                  </span>
                </button>
              )
            })}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
