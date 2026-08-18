import { createContext, useContext } from 'react'

import type { PropertyListContext, PropertyListKey } from './types'

// oxlint-disable-next-line typescript-eslint/no-explicit-any
const PropertyListReactContext = createContext<PropertyListContext<any> | null>(null)

export function usePropertyList<K extends PropertyListKey>(): PropertyListContext<K> {
  const context = useContext(PropertyListReactContext)
  if (!context) {
    throw new Error('[openweave] PropertyList part must be used inside PropertyListRoot')
  }
  return context as PropertyListContext<K>
}

export function usePropertyListPart<K extends PropertyListKey>(propKey: K): PropertyListContext<K> {
  const context = usePropertyList<K>()
  if (context.propKey !== propKey) {
    throw new Error(
      `[openweave] PropertyList part propKey must match PropertyListRoot (${propKey})`
    )
  }
  return context
}

export const PropertyListProvider = PropertyListReactContext.Provider
