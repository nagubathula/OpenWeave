import * as SelectPrimitive from '@radix-ui/react-select'
import { Check, ChevronDown, ChevronUp } from 'lucide-react'
import React, { forwardRef } from 'react'
import { tv } from 'tailwind-variants'

import type { ComponentUI } from '@/components/ui/types'
import theme from '@/theme/app-select'
import type { AppSelectTheme } from '@/theme/app-select'

export interface AppSelectProps<TValue extends string | number> extends Omit<
  SelectPrimitive.SelectProps,
  'value' | 'onValueChange'
> {
  label?: string
  options: { value: TValue; label: string }[]
  placeholder?: string
  ui?: ComponentUI<AppSelectTheme>
  value?: TValue
  onValueChange?: (value: TValue) => void
  id?: string
}

const styles = tv(theme)()

// Note: Radix Select value must be a string. If TValue is number, we need to map it.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const AppSelect = forwardRef<HTMLButtonElement, AppSelectProps<any>>(
  ({ options, label, placeholder, ui, value, onValueChange, id, ...props }, ref) => {
    // Radix requires string values. Convert number to string for Radix, and back to number for onValueChange if needed.
    const isNumber = options.length > 0 && typeof options[0].value === 'number'

    const handleValueChange = (val: string) => {
      if (onValueChange) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onValueChange(isNumber ? (Number(val) as any) : val)
      }
    }

    const stringValue = value !== undefined ? String(value) : undefined

    return (
      <SelectPrimitive.Root value={stringValue} onValueChange={handleValueChange} {...props}>
        <SelectPrimitive.Trigger
          ref={ref}
          id={id}
          className={styles.trigger({ className: ui?.trigger })}
          aria-label={label}
        >
          <SelectPrimitive.Value
            placeholder={placeholder}
            className={styles.value({ className: ui?.value })}
          />
          <SelectPrimitive.Icon asChild>
            <ChevronDown className="ml-1 h-3 w-3 shrink-0 text-muted" />
          </SelectPrimitive.Icon>
        </SelectPrimitive.Trigger>
        <SelectPrimitive.Portal>
          <SelectPrimitive.Content
            position="popper"
            sideOffset={2}
            className={styles.content({ className: ui?.content })}
          >
            <SelectPrimitive.ScrollUpButton className="flex items-center justify-center py-0.5 text-muted">
              <ChevronUp className="h-3.5 w-3.5" />
            </SelectPrimitive.ScrollUpButton>
            <SelectPrimitive.Viewport className={styles.viewport({ className: ui?.viewport })}>
              {options.map((opt) => (
                <SelectPrimitive.Item
                  key={String(opt.value)}
                  value={String(opt.value)}
                  className={styles.item({ className: ui?.item })}
                >
                  <SelectPrimitive.ItemIndicator
                    className={styles.indicator({ className: ui?.indicator })}
                  >
                    <Check className="h-3 w-3 text-accent" />
                  </SelectPrimitive.ItemIndicator>
                  <SelectPrimitive.ItemText>{opt.label}</SelectPrimitive.ItemText>
                </SelectPrimitive.Item>
              ))}
            </SelectPrimitive.Viewport>
            <SelectPrimitive.ScrollDownButton className="flex items-center justify-center py-0.5 text-muted">
              <ChevronDown className="h-3.5 w-3.5" />
            </SelectPrimitive.ScrollDownButton>
          </SelectPrimitive.Content>
        </SelectPrimitive.Portal>
      </SelectPrimitive.Root>
    )
  }
)
AppSelect.displayName = 'AppSelect'
