import type { NumberExpressionError } from '#react/controls/number-expression'
import type { ReactNode, RefObject } from 'react'

export type NumberFieldEditPolicy = 'editable' | 'readonly' | 'detach-on-edit'
export type NumberFieldMutationSource = 'edit' | 'scrub' | 'step'

export interface NumberFieldRootProps {
  /** Current numeric value or the mixed-value sentinel. */
  modelValue: number | symbol
  /** Minimum allowed value. */
  min?: number
  /** Maximum allowed value and percentage-expression basis. */
  max?: number
  /** Pointer-scrub and Arrow-key increment. */
  step?: number
  /** Multiplier applied to pointer-scrub movement. */
  sensitivity?: number
  /** Text shown when modelValue is mixed. */
  placeholder?: string
  /** Accessible name for the spinbutton. */
  ariaLabel?: string
  /** Prevents editing, scrubbing, and keyboard stepping. */
  disabled?: boolean
  /** Marks the value as controlled by an external binding. */
  bound?: boolean
  /** Mutation policy used when the value is bound. */
  editPolicy?: NumberFieldEditPolicy

  onModelValueChange?: (value: number) => void
  onCommit?: (value: number, previous: number) => void
  onEditingChange?: (editing: boolean) => void
  onInvalid?: (expression: string, reason: NumberExpressionError) => void
  onDetachRequest?: (source: NumberFieldMutationSource) => void

  children?: ReactNode | ((props: NumberFieldSlotProps) => ReactNode)
}

export interface NumberFieldState {
  editing: boolean
  scrubbing: boolean
  mixed: boolean
  disabled: boolean
  bound: boolean
}

export interface NumberFieldStateAttrs {
  'data-editing'?: ''
  'data-scrubbing'?: ''
  'data-mixed'?: ''
  'data-disabled'?: ''
  'data-bound'?: ''
}

export interface NumberFieldRootAttrs extends NumberFieldStateAttrs {
  role: 'spinbutton' | undefined
  tabIndex: 0 | -1 | undefined
  'aria-valuenow'?: number
  'aria-valuemin'?: number
  'aria-valuemax'?: number
  'aria-disabled'?: 'true'
  'aria-label'?: string
  onFocus: () => void
  onKeyDown: (event: React.KeyboardEvent) => void
}

export interface NumberFieldActions {
  startScrub(event: React.PointerEvent): void
  startEdit(): void
  cancelEdit(): void
  commitEdit(event?: Event | React.FocusEvent): void
  setDraft(value: string): void
  input(event: React.FormEvent<HTMLInputElement>): void
  keydown(event: React.KeyboardEvent): void
}

export interface NumberFieldSlotProps extends NumberFieldState {
  modelValue: number | symbol
  displayValue: string
  draftValue: string
  isMixed: boolean
  placeholder: string
  state: NumberFieldState
  attrs: NumberFieldRootAttrs
  actions: NumberFieldActions
}

export interface NumberFieldContext {
  modelValue: number | symbol
  numericValue: number
  displayValue: string
  draftValue: string
  isMixed: boolean
  editing: boolean
  scrubbing: boolean
  disabled: boolean
  bound: boolean
  min: number
  max: number
  step: number
  ariaLabel: string | undefined
  inputRef: RefObject<HTMLInputElement | null>
  state: NumberFieldState
  stateAttrs: NumberFieldStateAttrs
  rootAttrs: NumberFieldRootAttrs
  slotProps: NumberFieldSlotProps
  actions: NumberFieldActions
  invalidReason: NumberExpressionError | null
}
