import React, { useRef, useImperativeHandle, forwardRef } from 'react'
import { useEditor } from '#react/editor/context'
import { useCanvas } from '#react/canvas/surface/use'
import { CanvasContext, type CanvasContext as CanvasContextType } from './context'

export interface CanvasRootProps {
  showRulers?: boolean
  children?: React.ReactNode
}

export interface CanvasRootRef {
  renderNow: () => void
}

export const CanvasRoot = forwardRef<CanvasRootRef, CanvasRootProps>(function CanvasRoot(
  { showRulers = false, children },
  ref
) {
  const store = useEditor()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { renderNow, hitTestSectionTitle, hitTestComponentLabel, hitTestFrameTitle } =
    useCanvas(canvasRef, store, { showRulers })

  useImperativeHandle(ref, () => ({ renderNow }), [renderNow])

  const contextValue: CanvasContextType = {
    canvasRef,
    renderNow,
    hitTestSectionTitle,
    hitTestComponentLabel,
    hitTestFrameTitle
  }

  return (
    <CanvasContext.Provider value={contextValue}>
      {children}
    </CanvasContext.Provider>
  )
})

export default CanvasRoot
