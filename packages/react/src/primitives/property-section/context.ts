import { createContext, useContext } from 'react'

import type { PropertySectionContext } from './types'

const PropertySectionReactContext = createContext<PropertySectionContext | null>(null)

export function usePropertySection(): PropertySectionContext {
  const context = useContext(PropertySectionReactContext)
  if (!context) {
    throw new Error('usePropertySection must be used within a PropertySectionRoot')
  }
  return context
}

export const PropertySectionProvider = PropertySectionReactContext.Provider
