import { createContext, useContext, type RefObject } from 'react'
import type { SceneNode } from '@openweave/scene-graph'

export interface CanvasContext {
  canvasRef: RefObject<HTMLCanvasElement | null>
  renderNow: () => void
  hitTestSectionTitle: (cx: number, cy: number) => SceneNode | null
  hitTestComponentLabel: (cx: number, cy: number) => SceneNode | null
  hitTestFrameTitle: (cx: number, cy: number) => SceneNode | null
}

export const CanvasContext = createContext<CanvasContext | null>(null)

export function useCanvasContext(): CanvasContext {
  const ctx = useContext(CanvasContext)
  if (!ctx) throw new Error('[openweave] useCanvasContext() called outside <CanvasRoot>')
  return ctx
}
