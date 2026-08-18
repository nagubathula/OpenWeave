import React, { useEffect, useRef } from 'react'

import { useNumberField } from './context'

export interface NumberFieldInputProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'value'
> {}

export function NumberFieldInput(props: NumberFieldInputProps) {
  const ctx = useNumberField()
  const inputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    // Sync the local ref to the context's inputRef
    if (ctx.inputRef && 'current' in ctx.inputRef) {
      ;(ctx.inputRef as React.MutableRefObject<HTMLInputElement | null>).current = inputRef.current
    }
  }, [ctx.inputRef])

  if (!ctx.editing) return null

  const ariaAttrs = {
    role: 'spinbutton' as const,
    'aria-valuenow': ctx.isMixed ? undefined : ctx.numericValue,
    'aria-valuemin': Number.isFinite(ctx.min) ? ctx.min : undefined,
    'aria-valuemax': Number.isFinite(ctx.max) ? ctx.max : undefined,
    'aria-disabled': ctx.disabled ? ('true' as const) : undefined,
    'aria-label': ctx.ariaLabel
  }

  return (
    <input
      ref={inputRef}
      data-slot="input"
      type="text"
      inputMode="decimal"
      autoComplete="off"
      spellCheck={false}
      disabled={ctx.disabled}
      value={ctx.draftValue}
      onBlur={(e) => {
        ctx.actions.commitEdit(e)
        props.onBlur?.(e)
      }}
      onKeyDown={(e) => {
        e.stopPropagation()
        ctx.actions.keydown(e)
        props.onKeyDown?.(e)
      }}
      onInput={(e) => {
        ctx.actions.input(e)
        props.onInput?.(e)
      }}
      {...ctx.stateAttrs}
      {...ariaAttrs}
      {...props}
    />
  )
}

export default NumberFieldInput
