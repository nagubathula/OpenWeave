import React, { useState, useMemo, useEffect, useRef } from 'react'

import type { BindingProvider, BindingTarget } from '#react/controls/binding-provider/types'
import { BindableValueProvider } from './context'
import type {
  BindableValueActions,
  BindableValueContext,
  BindableValueRootProps,
  BindableValueSlotProps,
  BindableValueStateAttrs
} from './types'

// Note: React Context provider must be passed via provider prop or a surrounding context if implemented
export function BindableValueRoot<V = unknown>({
  provider: providerProp,
  targets,
  value,
  policy = 'detach-on-edit',
  batchLabel = 'Edit bound value',
  children
}: BindableValueRootProps<V>) {
  // If providerProp is not provided, you should fall back to a nearest injected provider (e.g. from context)
  const provider = providerProp!
  if (!provider) {
    throw new Error('[openweave] BindableValueRoot requires a provider prop')
  }

  const [open, setOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  // Because provider might use external reactivity, you may need a way to force update
  // For now, we compute state based on current props and provider calls.
  // When provider.revision changes, a re-render should be triggered externally.

  const state = provider.getState(targets)
  
  const variable = useMemo(() => {
    const target = targets[0]
    return state === 'bound' && target ? provider.getBound(target) : undefined
  }, [state, targets, provider])

  const resolvedValue = useMemo(() => {
    return variable ? provider.resolve(variable.id) : undefined
  }, [variable, provider])

  const variables = useMemo(() => {
    return provider.filterVariables(searchTerm)
  }, [searchTerm, provider])

  const stateAttrs = useMemo<BindableValueStateAttrs>(() => ({
    'data-unbound': state === 'unbound' ? '' : undefined,
    'data-bound': state === 'bound' ? '' : undefined,
    'data-mixed': state === 'mixed' ? '' : undefined,
    'data-picker-open': open ? '' : undefined,
    'data-policy': policy
  }), [state, open, policy])

  const interactionRef = useRef({
    active: false,
    detached: false,
    bindingSnapshot: new Map<BindingTarget, string>(),
    resolvedSnapshot: undefined as V | undefined
  })

  const actions = useMemo<BindableValueActions<V>>(() => {
    const runImmediate = (label: string, action: () => void) => {
      if (provider.runBatch) provider.runBatch(label, action)
      else action()
    }

    return {
      bind: (variableId: string) => {
        runImmediate('Bind variable', () => {
          for (const target of targets) provider.bind(target, variableId)
        })
        setOpen(false)
      },
      unbind: () => {
        runImmediate('Unbind variable', () => {
          for (const target of targets) provider.unbind(target)
        })
      },
      create: (name: string) => {
        const target = targets[0]
        if (!target || !provider.create) return
        runImmediate('Create and bind variable', () => provider.create?.(target, value, name))
        setOpen(false)
      },
      openPicker: () => setOpen(true),
      closePicker: () => setOpen(false),
      togglePicker: () => setOpen((prev) => !prev),
      setSearchTerm,
      beginMutation: (source) => {
        const iState = interactionRef.current
        if (iState.active) return true
        const startedUnbound = state === 'unbound'
        const startedMixed = state === 'mixed'

        if (!startedUnbound && !startedMixed && policy === 'readonly-when-bound') return false
        if (
          !startedUnbound &&
          !startedMixed &&
          policy === 'edit-variable' &&
          (!variable || !provider.setValue)
        ) {
          return false
        }

        iState.active = true
        if (!startedUnbound) {
          iState.bindingSnapshot.clear()
          for (const target of targets) {
            const current = provider.getBound(target)
            if (current) iState.bindingSnapshot.set(target, current.id)
          }
        }
        iState.resolvedSnapshot = resolvedValue

        if (provider.beginBatch) provider.beginBatch(batchLabel)

        if (startedMixed || (!startedUnbound && policy === 'detach-on-edit')) {
          iState.detached = true
          for (const target of targets) provider.unbind(target)
        }
        return true
      },
      applyValue: (nextValue: V) => {
        const iState = interactionRef.current
        if (policy !== 'edit-variable' || !iState.active) return false
        if (!variable || !provider.setValue) return false
        provider.setValue(variable.id, nextValue)
        return true
      },
      commitMutation: () => {
        const iState = interactionRef.current
        if (!iState.active) return
        if (provider.commitBatch) provider.commitBatch()
        iState.active = false
        iState.detached = false
        iState.bindingSnapshot.clear()
        iState.resolvedSnapshot = undefined
      },
      cancelMutation: () => {
        const iState = interactionRef.current
        if (!iState.active) return
        if (provider.rollbackBatch) {
          provider.rollbackBatch()
        } else {
          if (iState.detached) {
            for (const [target, variableId] of iState.bindingSnapshot) {
              provider.bind(target, variableId)
            }
          } else if (
            policy === 'edit-variable' &&
            variable &&
            iState.resolvedSnapshot !== undefined &&
            provider.setValue
          ) {
            provider.setValue(variable.id, iState.resolvedSnapshot)
          }
        }
        iState.active = false
        iState.detached = false
        iState.bindingSnapshot.clear()
        iState.resolvedSnapshot = undefined
      }
    }
  }, [targets, provider, value, state, policy, variable, resolvedValue, batchLabel])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      actions.cancelMutation()
    }
  }, [actions])

  const slotProps = useMemo<BindableValueSlotProps<V>>(() => ({
    state,
    variable,
    resolvedValue,
    policy,
    open,
    searchTerm,
    variables,
    stateAttrs,
    actions
  }), [state, variable, resolvedValue, policy, open, searchTerm, variables, stateAttrs, actions])

  const contextValue = useMemo<BindableValueContext<V>>(() => ({
    provider,
    targets,
    value,
    state,
    variable,
    resolvedValue,
    policy,
    open,
    searchTerm,
    variables,
    stateAttrs,
    slotProps,
    actions
  }), [provider, targets, value, state, variable, resolvedValue, policy, open, searchTerm, variables, stateAttrs, slotProps, actions])

  const renderedChildren = typeof children === 'function' ? children(slotProps) : children

  return (
    <BindableValueProvider value={contextValue}>
      {renderedChildren}
    </BindableValueProvider>
  )
}

export default BindableValueRoot
