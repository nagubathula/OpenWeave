import { createContext, useContext } from 'react'

import type { BindableValueContext } from './types'

const BindableValueReactContext = createContext<BindableValueContext<unknown> | null>(null)

export function useBindableValue<V>(): BindableValueContext<V> {
  const context = useContext(BindableValueReactContext)
  if (!context) {
    throw new Error('[openweave] BindableValue part must be used inside BindableValueRoot')
  }
  return context as BindableValueContext<V>
}

export function useOptionalBindableValue<V>(): BindableValueContext<V> | undefined {
  const context = useContext(BindableValueReactContext)
  return (context as BindableValueContext<V>) ?? undefined
}

export const BindableValueProvider = BindableValueReactContext.Provider
