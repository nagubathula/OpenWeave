import { createContext, useContext } from 'react'

import type { SegmentedControlContext } from './types'

const SegmentedControlReactContext = createContext<SegmentedControlContext | null>(null)

export function useSegmentedControl(): SegmentedControlContext {
  const context = useContext(SegmentedControlReactContext)
  if (!context) {
    throw new Error('useSegmentedControl must be used within a SegmentedControlRoot')
  }
  return context
}

export const SegmentedControlProvider = SegmentedControlReactContext.Provider
