import * as SelectPrimitive from '@radix-ui/react-select'
import { Check, ChevronDown } from 'lucide-react'
import React from 'react'

import { useSelectUI } from '@/components/ui/select'

export interface FieldSelectMenuOption {
  value: string
  label: React.ReactNode
}

export interface FieldSelectMenuProps {
  value: string
  onValueChange: (value: string) => void
  options: FieldSelectMenuOption[]
  ariaLabel: string
  dataTestId?: string
  triggerContent?: React.ReactNode
  seamless?: boolean
  className?: string
}

/**
 * Small chevron dropdown trigger used beside a number field (gap
 * auto/fixed toggle, size axis sizing + limits menu, size limit actions).
 * When seamless is true, renders borderless/ghost style to blend inside unified controls.
 */
export default function FieldSelectMenu({
  value,
  onValueChange,
  options,
  ariaLabel,
  dataTestId,
  triggerContent,
  seamless = false,
  className
}: FieldSelectMenuProps) {
  const ui = useSelectUI({ item: 'rounded py-1.5 pr-2 pl-6 text-xs' })

  const triggerClass = seamless
    ? `flex h-5 shrink-0 cursor-pointer items-center gap-0.5 rounded px-1 text-[10px] text-muted outline-none hover:bg-hover/60 hover:text-surface data-[state=open]:bg-hover data-[state=open]:text-surface${className ? ` ${className}` : ''}`
    : `flex h-6 shrink-0 cursor-pointer items-center gap-0.5 self-stretch rounded border border-border bg-panel-field px-1 text-[10px] font-medium text-muted outline-none hover:bg-panel-field-hover hover:text-surface data-[state=open]:text-surface${className ? ` ${className}` : ''}`

  return (
    <SelectPrimitive.Root value={value} onValueChange={onValueChange}>
      <SelectPrimitive.Trigger
        data-test-id={dataTestId}
        aria-label={ariaLabel}
        className={triggerClass}
        onPointerDown={(event) => event.stopPropagation()}
      >
        {triggerContent}
        <SelectPrimitive.Icon asChild>
          <ChevronDown className="size-2.5 opacity-70" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          position="popper"
          align="start"
          sideOffset={4}
          className={ui.content}
        >
          <SelectPrimitive.Viewport className="p-0.5">
            {options.map((option) => (
              <SelectPrimitive.Item key={option.value} value={option.value} className={ui.item}>
                <SelectPrimitive.ItemIndicator className="absolute left-1.5 inline-flex items-center justify-center">
                  <Check className="size-3 text-accent" />
                </SelectPrimitive.ItemIndicator>
                <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  )
}
