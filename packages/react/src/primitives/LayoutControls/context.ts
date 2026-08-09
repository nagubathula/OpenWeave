import { createContext, useContext } from 'react'
import type { SceneNode } from '@openweave/scene-graph'
import type { useLayout } from '#react/controls/layout/use'

type RawLayoutControlsContext = ReturnType<typeof useLayout>
export type LayoutControlsContext = Omit<RawLayoutControlsContext, 'node'> & { node: SceneNode }

const LayoutControlsContextReact = createContext<LayoutControlsContext | null>(null)

export function useLayoutControlsContext(): LayoutControlsContext {
  const ctx = useContext(LayoutControlsContextReact)
  if (!ctx) throw new Error('Layout controls must be used within LayoutControlsRoot')
  return ctx
}

export const LayoutControlsProvider = LayoutControlsContextReact.Provider
