import {
  clampNumberValue,
  evaluateNumberExpression,
  normalizeNumberValue,
  stepNumberValue,
  type NumberExpressionError
} from '#react/controls/number-expression'
import { useOptionalBindableValue } from '#react/primitives/bindable-value/context'
import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react'

import { NumberFieldProvider } from './context'
import type {
  NumberFieldActions,
  NumberFieldEditPolicy,
  NumberFieldMutationSource,
  NumberFieldRootAttrs,
  NumberFieldRootProps,
  NumberFieldSlotProps,
  NumberFieldState,
  NumberFieldStateAttrs,
  NumberFieldContext
} from './types'

export function NumberFieldRoot({
  modelValue,
  min = -Infinity,
  max = Infinity,
  step = 1,
  sensitivity = 1,
  placeholder = 'Mixed',
  ariaLabel,
  disabled: disabledProp = false,
  bound: boundProp = false,
  editPolicy = 'editable',
  onModelValueChange,
  onCommit,
  onEditingChange,
  onInvalid,
  onDetachRequest,
  children
}: NumberFieldRootProps) {
  const binding = useOptionalBindableValue<number>()
  const [editing, setEditing] = useState(false)
  const [scrubbing, setScrubbing] = useState(false)
  const [draftValue, setDraftValueState] = useState('')
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [invalidReason, setInvalidReason] = useState<NumberExpressionError | null>(null)
  const [workingValue, setWorkingValue] = useState(0)

  const isMixed = binding?.state === 'mixed' || typeof modelValue === 'symbol'

  const numericValue = useMemo(() => {
    const resolved = binding?.resolvedValue
    if (binding?.state === 'bound' && typeof resolved === 'number') return resolved
    return typeof modelValue === 'number' ? modelValue : 0
  }, [binding?.state, binding?.resolvedValue, modelValue])

  const displayValue = isMixed ? '' : String(normalizeNumberValue(numericValue))
  const disabled = disabledProp
  const bound = binding ? binding.state === 'bound' : boundProp

  const effectiveEditPolicy = useMemo<NumberFieldEditPolicy>(() => {
    if (!binding) return editPolicy
    if (binding.policy === 'readonly-when-bound') return 'readonly'
    if (binding.policy === 'detach-on-edit') return 'detach-on-edit'
    return 'editable'
  }, [binding, editPolicy])

  const stepValue = Number.isFinite(step) && step > 0 ? step : 1

  const interactionRef = useRef({
    startValue: 0,
    startedMixed: false,
    mutationRequested: false,
    stopMove: undefined as ((e: PointerEvent) => void) | undefined,
    stopUp: undefined as ((e: PointerEvent) => void) | undefined,
    stopCancel: undefined as ((e: PointerEvent) => void) | undefined,
    scrubTarget: undefined as Element | undefined,
    scrubPointerId: undefined as number | undefined
  })

  const canMutate = useCallback(() => {
    return !disabled && !(bound && effectiveEditPolicy === 'readonly')
  }, [disabled, bound, effectiveEditPolicy])

  const requestMutation = useCallback(
    (source: NumberFieldMutationSource) => {
      const iState = interactionRef.current
      if (iState.mutationRequested) return true
      if (!canMutate()) return false
      if (binding && !binding.actions.beginMutation(source)) return false
      if (!binding && bound && effectiveEditPolicy === 'detach-on-edit') {
        onDetachRequest?.(source)
      }
      iState.mutationRequested = true
      return true
    },
    [canMutate, binding, bound, effectiveEditPolicy, onDetachRequest]
  )

  const beginInteraction = useCallback(() => {
    const iState = interactionRef.current
    iState.startValue = numericValue
    iState.startedMixed = isMixed
    setWorkingValue(numericValue)
    iState.mutationRequested = false
    setInvalidReason(null)
  }, [numericValue, isMixed])

  const updateValue = useCallback(
    (value: number) => {
      const normalized = normalizeNumberValue(clampNumberValue(value, min, max))
      setWorkingValue(normalized)
      if (binding?.actions.applyValue(normalized)) return
      if (modelValue !== normalized) onModelValueChange?.(normalized)
    },
    [min, max, binding?.actions, modelValue, onModelValueChange]
  )

  const restoreInteractionValue = useCallback(() => {
    const iState = interactionRef.current
    if (workingValue !== iState.startValue || iState.startedMixed !== isMixed) {
      setWorkingValue(iState.startValue)
      if (!binding?.actions.applyValue(iState.startValue)) {
        onModelValueChange?.(iState.startValue)
      }
    }
  }, [workingValue, isMixed, binding?.actions, onModelValueChange])

  const finishCommit = useCallback(
    (value: number) => {
      const iState = interactionRef.current
      updateValue(value)
      setEditing(false)
      if (workingValue !== iState.startValue) {
        onCommit?.(workingValue, iState.startValue)
      }
      binding?.actions.commitMutation()
    },
    [updateValue, workingValue, onCommit, binding?.actions]
  )

  const startEdit = useCallback(() => {
    if (editing || !canMutate()) return
    beginInteraction()
    const iState = interactionRef.current
    setDraftValueState(iState.startedMixed ? '' : String(iState.startValue))
    setEditing(true)
    setTimeout(() => {
      inputRef.current?.focus()
      inputRef.current?.select()
    }, 0)
  }, [editing, canMutate, beginInteraction])

  const setDraft = useCallback(
    (value: string) => {
      if (value !== draftValue && !requestMutation('edit')) return
      setDraftValueState(value)
      const absoluteNumber = /^\s*(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?\s*$/i.test(value)
      if (absoluteNumber) updateValue(Number(value))
    },
    [draftValue, requestMutation, updateValue]
  )

  const onInput = useCallback(
    (event: React.FormEvent<HTMLInputElement>) => {
      setDraft(event.currentTarget.value)
    },
    [setDraft]
  )

  const commitEdit = useCallback(() => {
    if (!editing) return
    const expression = draftValue
    const iState = interactionRef.current
    const result = evaluateNumberExpression(expression, {
      current: iState.startValue,
      max,
      mixed: iState.startedMixed
    })
    if (!result.ok) {
      setInvalidReason(result.error)
      restoreInteractionValue()
      setEditing(false)
      binding?.actions.cancelMutation()
      onInvalid?.(expression, result.error)
      return
    }
    finishCommit(result.value)
  }, [editing, draftValue, max, restoreInteractionValue, binding?.actions, onInvalid, finishCommit])

  const cancelEdit = useCallback(() => {
    if (!editing) return
    restoreInteractionValue()
    setInvalidReason(null)
    setEditing(false)
    binding?.actions.cancelMutation()
  }, [editing, restoreInteractionValue, binding?.actions])

  const stopScrubListeners = useCallback(() => {
    const iState = interactionRef.current
    const target = iState.scrubTarget ?? document
    if (iState.stopMove) target.removeEventListener('pointermove', iState.stopMove as EventListener)
    if (iState.stopUp) target.removeEventListener('pointerup', iState.stopUp as EventListener)
    if (iState.stopCancel)
      target.removeEventListener('pointercancel', iState.stopCancel as EventListener)

    iState.stopMove = undefined
    iState.stopUp = undefined
    iState.stopCancel = undefined

    if (
      iState.scrubTarget &&
      iState.scrubPointerId != null &&
      iState.scrubTarget.hasPointerCapture(iState.scrubPointerId)
    ) {
      iState.scrubTarget.releasePointerCapture(iState.scrubPointerId)
    }
    iState.scrubTarget = undefined
    iState.scrubPointerId = undefined
    if (typeof document !== 'undefined') document.body.style.cursor = ''
  }, [])

  const startScrub = useCallback(
    (event: React.PointerEvent) => {
      if (!canMutate()) return
      event.preventDefault()
      beginInteraction()

      const iState = interactionRef.current
      const startX = event.clientX
      let lastX = startX
      let accumulated = numericValue
      let hasMoved = false

      const target = event.currentTarget instanceof Element ? event.currentTarget : undefined
      iState.scrubTarget = target
      iState.scrubPointerId = event.pointerId
      target?.setPointerCapture(event.pointerId)
      const listenerTarget = target ?? document

      const onMove = (moveEvent: PointerEvent) => {
        if (moveEvent.pointerId !== event.pointerId) return
        const dx = moveEvent.clientX - lastX
        lastX = moveEvent.clientX
        if (!hasMoved && Math.abs(moveEvent.clientX - startX) > 2) {
          if (!requestMutation('scrub')) return
          hasMoved = true
          setScrubbing(true)
          document.body.style.cursor = 'ew-resize'
        }
        if (!hasMoved) return
        accumulated += dx * stepValue * sensitivity
        updateValue(accumulated)
      }

      const finish = (cancelled: boolean) => {
        stopScrubListeners()
        setScrubbing(false)
        if (cancelled) {
          restoreInteractionValue()
          binding?.actions.cancelMutation()
          return
        }
        if (!hasMoved) {
          startEdit()
          return
        }
        if (workingValue !== iState.startValue) {
          onCommit?.(workingValue, iState.startValue)
        }
        binding?.actions.commitMutation()
      }

      const onUp = (upEvent: PointerEvent) => {
        if (upEvent.pointerId === event.pointerId) finish(false)
      }
      const onCancel = (cancelEvent: PointerEvent) => {
        if (cancelEvent.pointerId === event.pointerId) finish(true)
      }

      iState.stopMove = onMove
      iState.stopUp = onUp
      iState.stopCancel = onCancel

      listenerTarget.addEventListener('pointermove', onMove as EventListener)
      listenerTarget.addEventListener('pointerup', onUp as EventListener)
      listenerTarget.addEventListener('pointercancel', onCancel as EventListener)
    },
    [
      canMutate,
      beginInteraction,
      numericValue,
      requestMutation,
      stepValue,
      sensitivity,
      updateValue,
      stopScrubListeners,
      restoreInteractionValue,
      binding?.actions,
      startEdit,
      workingValue,
      onCommit
    ]
  )

  const stepValueFromKeyboard = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.code !== 'ArrowUp' && event.code !== 'ArrowDown') return false
      if (!editing) beginInteraction()
      if (!requestMutation('step')) return true
      event.preventDefault()

      const iState = interactionRef.current
      const draftResult = editing
        ? evaluateNumberExpression(draftValue, {
            current: iState.startValue,
            max,
            mixed: iState.startedMixed
          })
        : undefined

      const base = draftResult?.ok ? draftResult.value : workingValue
      const next = stepNumberValue(
        base,
        event.code === 'ArrowUp' ? 1 : -1,
        stepValue,
        event.nativeEvent,
        min,
        max
      )
      updateValue(next)
      setDraftValueState(String(next))

      if (!editing) {
        if (next !== iState.startValue) onCommit?.(next, iState.startValue)
        binding?.actions.commitMutation()
      }
      return true
    },
    [
      editing,
      beginInteraction,
      requestMutation,
      draftValue,
      max,
      workingValue,
      stepValue,
      min,
      updateValue,
      onCommit,
      binding?.actions
    ]
  )

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (stepValueFromKeyboard(event)) return
      if (event.code === 'Enter') {
        event.preventDefault()
        commitEdit()
      } else if (event.code === 'Escape') {
        event.preventDefault()
        cancelEdit()
      }
    },
    [stepValueFromKeyboard, commitEdit, cancelEdit]
  )

  const state = useMemo<NumberFieldState>(
    () => ({
      editing,
      scrubbing,
      mixed: isMixed,
      disabled,
      bound
    }),
    [editing, scrubbing, isMixed, disabled, bound]
  )

  const stateAttrs = useMemo<NumberFieldStateAttrs>(
    () => ({
      'data-editing': editing ? '' : undefined,
      'data-scrubbing': scrubbing ? '' : undefined,
      'data-mixed': isMixed ? '' : undefined,
      'data-disabled': disabled ? '' : undefined,
      'data-bound': bound ? '' : undefined
    }),
    [editing, scrubbing, isMixed, disabled, bound]
  )

  const rootTabIndex = editing ? undefined : disabled ? -1 : 0

  const rootAttrs = useMemo<NumberFieldRootAttrs>(
    () => ({
      ...stateAttrs,
      role: editing ? undefined : 'spinbutton',
      tabIndex: rootTabIndex,
      'aria-valuenow': editing || isMixed ? undefined : numericValue,
      'aria-valuemin': !editing && Number.isFinite(min) ? min : undefined,
      'aria-valuemax': !editing && Number.isFinite(max) ? max : undefined,
      'aria-disabled': !editing && disabled ? 'true' : undefined,
      'aria-label': editing ? undefined : ariaLabel,
      onFocus: startEdit,
      onKeyDown
    }),
    [
      stateAttrs,
      editing,
      rootTabIndex,
      isMixed,
      numericValue,
      min,
      max,
      disabled,
      ariaLabel,
      startEdit,
      onKeyDown
    ]
  )

  const actions = useMemo<NumberFieldActions>(
    () => ({
      startScrub,
      startEdit,
      cancelEdit,
      commitEdit,
      setDraft,
      input: onInput,
      keydown: onKeyDown
    }),
    [startScrub, startEdit, cancelEdit, commitEdit, setDraft, onInput, onKeyDown]
  )

  const slotProps = useMemo<NumberFieldSlotProps>(
    () => ({
      modelValue,
      displayValue,
      draftValue,
      isMixed,
      placeholder,
      ...state,
      state,
      attrs: rootAttrs,
      actions
    }),
    [modelValue, displayValue, draftValue, isMixed, placeholder, state, rootAttrs, actions]
  )

  const contextValue = useMemo<NumberFieldContext>(
    () => ({
      modelValue,
      numericValue,
      displayValue,
      draftValue,
      isMixed,
      editing,
      scrubbing,
      disabled,
      bound,
      min,
      max,
      step: stepValue,
      ariaLabel,
      inputRef,
      state,
      stateAttrs,
      rootAttrs,
      slotProps,
      actions,
      invalidReason
    }),
    [
      modelValue,
      numericValue,
      displayValue,
      draftValue,
      isMixed,
      editing,
      scrubbing,
      disabled,
      bound,
      min,
      max,
      stepValue,
      ariaLabel,
      state,
      stateAttrs,
      rootAttrs,
      slotProps,
      actions,
      invalidReason
    ]
  )

  const onEditingChangeRef = useRef(onEditingChange)
  onEditingChangeRef.current = onEditingChange
  const prevEditing = useRef(editing)
  useEffect(() => {
    if (prevEditing.current !== editing) {
      onEditingChangeRef.current?.(editing)
      prevEditing.current = editing
    }
  }, [editing])

  useEffect(() => {
    if (!editing && !scrubbing && typeof modelValue === 'number') {
      setWorkingValue(modelValue)
    }
  }, [modelValue, editing, scrubbing])

  useEffect(() => {
    return stopScrubListeners
  }, [stopScrubListeners])

  const renderedChildren = typeof children === 'function' ? children(slotProps) : children

  return <NumberFieldProvider value={contextValue}>{renderedChildren}</NumberFieldProvider>
}

export default NumberFieldRoot
