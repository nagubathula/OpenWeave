import type { BindingProvider } from '#react/controls/binding-provider/types'
import { createContext, useContext } from 'react'

const BindingProviderContext = createContext<BindingProvider | undefined>(undefined)

/**
 * Provider component that makes a {@link BindingProvider} available to
 * variable-capable field primitives (e.g. FillSwatch, BindableValue).
 */
export const BindingProviderProvider = BindingProviderContext.Provider

/**
 * Reads the nearest {@link BindingProvider}, or `undefined` when the field is
 * not variable-capable in the current subtree.
 */
export function useBindingProvider<V>(): BindingProvider<V> | undefined {
  return useContext(BindingProviderContext) as BindingProvider<V> | undefined
}
