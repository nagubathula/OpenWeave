import * as Popover from '@radix-ui/react-popover'
import React, { useEffect, useRef } from 'react'

import type { FontPickerUI } from './types'
import {
  useFontPicker,
  type FontAccessController,
  type FontFamilyOption
} from './useFontPicker'

export interface FontPickerRootProps {
  modelValue: string
  listFamilies: () => Promise<string[] | FontFamilyOption[]>
  localFontAccess?: FontAccessController
  ui?: FontPickerUI
  emptySearchText?: string
  emptyFontsText?: string
  emptyFontsHint?: string
  onUpdateModelValue?: (family: string) => void
  onSelect?: (family: string) => void
  trigger?: React.ReactNode | ((props: { value: string; open: boolean }) => React.ReactNode)
}

export function FontPickerRoot({
  modelValue,
  listFamilies,
  localFontAccess,
  ui,
  emptySearchText,
  emptyFontsText,
  emptyFontsHint,
  onUpdateModelValue,
  onSelect,
  trigger
}: FontPickerRootProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  const {
    searchTerm,
    open,
    filtered,
    loading,
    accessState,
    setSearchTerm,
    setOpen,
    requestAccess,
    select
  } = useFontPicker({
    modelValue,
    listFamilies,
    localFontAccess,
    onSelect,
    onUpdateModelValue
  })

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 0)
    }
  }, [open])

  const renderedTrigger = typeof trigger === 'function' ? trigger({ value: modelValue, open }) : trigger ?? (
    <button className={ui?.trigger}>
      <span className="truncate">{modelValue}</span>
    </button>
  )

  function renderEmptyState() {
    if (searchTerm) {
      return (
        <div className={ui?.empty}>
          {emptySearchText ?? 'No fonts found'}
        </div>
      )
    }

    return (
      <div className={ui?.empty}>
        <div>
          {accessState === 'prompt' && <p>Allow local font access to browse installed fonts.</p>}
          {accessState === 'denied' && <p>Local font access is blocked for this site.</p>}
          {accessState === 'unsupported' && <p>Local fonts are not available in this browser.</p>}
          {accessState !== 'prompt' && accessState !== 'denied' && accessState !== 'unsupported' && (
            <p>{emptyFontsText ?? 'No local fonts available.'}</p>
          )}
          {emptyFontsHint && <p className="mt-1">{emptyFontsHint}</p>}
          {accessState === 'prompt' && (
            <button
              type="button"
              className={ui?.emptyAction}
              disabled={loading}
              onClick={requestAccess}
            >
              {loading ? 'Loading...' : 'Allow local fonts'}
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        {renderedTrigger}
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          className={ui?.content}
          sideOffset={2}
          align="start"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <input
            ref={inputRef}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={ui?.search}
            placeholder="Search fonts..."
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck="false"
          />

          <div className={ui?.viewport ?? 'max-h-72 overflow-y-auto'}>
            {filtered.length > 0 ? (
              filtered.map((option) => (
                <div
                  key={option.family}
                  onClick={() => select(option.family)}
                  className={ui?.item}
                  style={{ fontFamily: `'${option.family}', sans-serif` }}
                  data-selected={option.family === modelValue ? '' : undefined}
                >
                  <span className="truncate">{option.family}</span>
                </div>
              ))
            ) : renderEmptyState()}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}

export default FontPickerRoot
