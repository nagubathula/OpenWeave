import React, { forwardRef, useState, useEffect, KeyboardEvent } from 'react'
import * as PopoverPrimitive from '@radix-ui/react-popover'
import { AppInput } from '@/components/ui/AppInput'
import { AppBadge } from '@/components/ui/AppBadge'
import { AppPlaceholder } from '@/components/ui/AppPlaceholder'
import { useSelectUI } from '@/components/ui/select'
import { useInputUI } from '@/components/ui/input'

export type AppComboboxOption = {
  value: string
  label: string
  meta?: string
}

export interface AppComboboxInputProps {
  options: AppComboboxOption[]
  placeholder?: string
  emptyLabel?: string
  ui?: {
    input?: string
    content?: string
    item?: string
    viewport?: string
    empty?: string
  }
  value: string
  onValueChange: (value: string) => void
}

export const AppComboboxInput = forwardRef<HTMLInputElement, AppComboboxInputProps>(
  ({ options, placeholder, emptyLabel = 'No results', ui, value, onValueChange, ...props }, ref) => {
    const [open, setOpen] = useState(false)
    const [focusedIndex, setFocusedIndex] = useState(-1)
    
    const select = useSelectUI({
      content: ui?.content ?? 'max-h-56 min-w-[var(--radix-popover-trigger-width)]',
      item: ui?.item ?? 'gap-2 rounded px-2 py-1.5 text-[11px]'
    })
    
    const inputClass = useInputUI({ size: 'sm', ui: { base: ui?.input } }).base
    const viewportClass = ui?.viewport ?? 'max-h-56 overflow-y-auto p-0.5'

    const query = value.trim().toLowerCase()
    const filteredOptions = query
      ? options
          .filter(
            (option) =>
              option.value.toLowerCase().includes(query) ||
              option.label.toLowerCase().includes(query)
          )
          .slice(0, 50)
      : options.slice(0, 50)

    useEffect(() => {
      setFocusedIndex(-1)
    }, [query])

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
      if (!open) {
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
          setOpen(true)
          e.preventDefault()
        }
        return
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setFocusedIndex((prev) => (prev < filteredOptions.length - 1 ? prev + 1 : prev))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setFocusedIndex((prev) => (prev > 0 ? prev - 1 : prev))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        if (focusedIndex >= 0 && focusedIndex < filteredOptions.length) {
          onValueChange(filteredOptions[focusedIndex].value)
          setOpen(false)
        }
      } else if (e.key === 'Escape') {
        setOpen(false)
      }
    }

    return (
      <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
        <PopoverPrimitive.Trigger asChild>
          <div className="w-full">
            <AppInput
              ref={ref}
              type="text"
              value={value}
              onChange={(e) => onValueChange(e.target.value)}
              placeholder={placeholder}
              className={inputClass}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
              onKeyDown={handleKeyDown}
              {...props}
            />
          </div>
        </PopoverPrimitive.Trigger>

        <PopoverPrimitive.Portal>
          <PopoverPrimitive.Content
            sideOffset={2}
            className={select.content}
            onOpenAutoFocus={(e) => e.preventDefault()}
          >
            <div className={viewportClass}>
              {filteredOptions.length > 0 ? (
                filteredOptions.map((option, index) => (
                  <div
                    key={option.value}
                    className={`${select.item} cursor-pointer flex items-center ${
                      index === focusedIndex ? 'bg-accent/10' : ''
                    }`}
                    onClick={() => {
                      onValueChange(option.value)
                      setOpen(false)
                    }}
                    onMouseEnter={() => setFocusedIndex(index)}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-surface">{option.label}</div>
                      <div className="truncate font-mono text-[10px] text-muted">{option.value}</div>
                    </div>
                    {option.meta && <AppBadge>{option.meta}</AppBadge>}
                  </div>
                ))
              ) : (
                <AppPlaceholder
                  label={emptyLabel}
                  fill={false}
                  size="compact"
                  ui={{ root: ui?.empty }}
                />
              )}
            </div>
          </PopoverPrimitive.Content>
        </PopoverPrimitive.Portal>
      </PopoverPrimitive.Root>
    )
  }
)
AppComboboxInput.displayName = 'AppComboboxInput'
