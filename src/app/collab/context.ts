import { createContext, useContext } from 'react'

import type { useCollab } from '@/app/collab/use'

export type CollabReturn = ReturnType<typeof useCollab>

/**
 * React context carrying the active collaboration (multiplayer) session.
 * `null` when collaboration is not active — consumers guard with `?.`.
 */
export const CollabContext = createContext<CollabReturn | null>(null)
export const CollabProvider = CollabContext.Provider

export function useCollabInjected(): CollabReturn | null {
  return useContext(CollabContext)
}
