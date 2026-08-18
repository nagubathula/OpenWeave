import React, {
  useRef,
  useState,
  useCallback,
  useImperativeHandle,
  forwardRef,
  type ReactNode
} from 'react'

import type { GradientStop } from '@openweave/scene-graph'

export interface GradientEditorBarProps {
  stops: GradientStop[]
  activeStopIndex: number
  barBackground: string
  ui?: {
    bar?: string
  }
  onSelectStop?: (index: number) => void
  onDragStop?: (index: number, position: number) => void
  children?: ReactNode | ((props: any) => ReactNode)
}

export const GradientEditorBar = forwardRef<HTMLDivElement, GradientEditorBarProps>(
  (
    { stops, activeStopIndex, barBackground, ui, onSelectStop, onDragStop, children },
    forwardedRef
  ) => {
    const barRef = useRef<HTMLDivElement>(null)
    const [draggingIndex, setDraggingIndex] = useState<number | null>(null)

    useImperativeHandle(forwardedRef, () => barRef.current!)

    const stopPointerDown = useCallback(
      (index: number, e: React.PointerEvent) => {
        onSelectStop?.(index)
        setDraggingIndex(index)
        barRef.current?.setPointerCapture(e.pointerId)
      },
      [onSelectStop]
    )

    const onPointerMove = useCallback(
      (e: React.PointerEvent) => {
        const el = barRef.current
        if (!el || draggingIndex === null || !el.hasPointerCapture(e.pointerId)) return
        const rect = el.getBoundingClientRect()
        const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
        onDragStop?.(draggingIndex, pos)
      },
      [draggingIndex, onDragStop]
    )

    const onPointerUp = useCallback(() => {
      setDraggingIndex(null)
    }, [])

    const actions = {
      stopPointerDown
    }

    const renderedChildren =
      typeof children === 'function'
        ? children({
            stops,
            activeStopIndex,
            barBackground,
            actions,
            draggingIndex
          })
        : children

    return (
      <div
        ref={barRef}
        className={ui?.bar}
        style={{ background: barBackground }}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {renderedChildren}
      </div>
    )
  }
)

GradientEditorBar.displayName = 'GradientEditorBar'
export default GradientEditorBar
