import { createContext, useContext } from 'react'

import type { NumberFieldContext } from './types'

const NumberFieldReactContext = createContext<NumberFieldContext | null>(null)

export function useNumberField(): NumberFieldContext {
  const context = useContext(NumberFieldReactContext)
  if (!context) {
    throw new Error('[openweave] NumberField part must be used inside NumberFieldRoot')
  }
  return context
}

export const NumberFieldProvider = NumberFieldReactContext.Provider
