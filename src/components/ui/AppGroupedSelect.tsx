import React, { forwardRef } from 'react'
import type { ReactNode } from 'react'
import { tv } from 'tailwind-variants'
import * as SelectPrimitive from '@radix-ui/react-select'
import { ChevronDown } from 'lucide-react'

import theme from '@/theme/app-grouped-select'
import type { AppGroupedSelectTheme } from '@/theme/app-grouped-select'
import type { ComponentUI } from '@/components/ui/types'

export interface SelectOption<TValue extends string | number> {
  value: TValue
  label: string
}

export interface SelectGroupDef<TValue extends string | number> {
  label?: string
  items: SelectOption<TValue>[]
}

export interface AppGroupedSelectProps<TValue extends string | number> extends Omit<SelectPrimitive.SelectProps, 'value' | 'onValueChange'> {
  groups: SelectGroupDef<TValue>[]
  displayValue: ReactNode
  ui?: ComponentUI<AppGroupedSelectTheme>
  value?: TValue
  onValueChange?: (value: TValue) => void
  id?: string
}

const styles = tv(theme)()

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const AppGroupedSelect = forwardRef<HTMLButtonElement, AppGroupedSelectProps<any>>(
  ({ groups, displayValue, ui, value, onValueChange, id, ...props }, ref) => {
    const isNumber = groups.length > 0 && groups[0].items.length > 0 && typeof groups[0].items[0].value === 'number'

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
        >
          {displayValue}
          <SelectPrimitive.Icon asChild>
            <ChevronDown className="h-2.5 w-2.5 shrink-0 text-muted" />
          </SelectPrimitive.Icon>
        </SelectPrimitive.Trigger>
        <SelectPrimitive.Portal>
          <SelectPrimitive.Content
            position="popper"
            sideOffset={4}
            className={styles.content({ className: ui?.content })}
          >
            <SelectPrimitive.Viewport className={styles.viewport({ className: ui?.viewport })}>
              {groups.map((group, index) => (
                <React.Fragment key={index}>
                  <SelectPrimitive.Group>
                    {group.label && (
                      <SelectPrimitive.Label className={styles.label({ className: ui?.label })}>
                        {group.label}
                      </SelectPrimitive.Label>
                    )}
                    {group.items.map((item) => (
                      <SelectPrimitive.Item
                        key={String(item.value)}
                        value={String(item.value)}
                        className={styles.item({ className: ui?.item })}
                      >
                        <SelectPrimitive.ItemText>{item.label}</SelectPrimitive.ItemText>
                      </SelectPrimitive.Item>
                    ))}
                  </SelectPrimitive.Group>
                  {index < groups.length - 1 && (
                    <SelectPrimitive.Separator className={styles.separator({ className: ui?.separator })} />
                  )}
                </React.Fragment>
              ))}
            </SelectPrimitive.Viewport>
          </SelectPrimitive.Content>
        </SelectPrimitive.Portal>
      </SelectPrimitive.Root>
    )
  }
)
AppGroupedSelect.displayName = 'AppGroupedSelect'
