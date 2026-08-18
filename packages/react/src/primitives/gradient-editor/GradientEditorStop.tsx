import { Slot } from '@radix-ui/react-slot'
import React, { useCallback, type ElementType } from 'react'

import { colorToCSS, colorToHexRaw } from '@openweave/core/color'

import type { GradientEditorStopProps, GradientEditorStopActions } from './types'

export function GradientEditorStop({
  stop,
  index,
  active,
  dragging = false,
  interactive = true,
  removable = true,
  positionStep = 1,
  label,
  as: Component = 'div',
  asChild = false,
  children,
  ...props
}: GradientEditorStopProps & { as?: ElementType; asChild?: boolean }) {
  const positionPercent = Math.round(stop.position * 100)
  const opacityPercent = Math.round(stop.color.a * 100)
  const hex = colorToHexRaw(stop.color)
  const css = colorToCSS(stop.color)
  const accessibleLabel = label ?? `Gradient stop ${index + 1}`

  const actions: GradientEditorStopActions = {
    select: () => props.onSelect?.(),
    updatePosition: (position) => props.onUpdatePosition?.(position),
    updateColor: (hexValue) => props.onUpdateColor?.(hexValue),
    updateOpacity: (opacity) => props.onUpdateOpacity?.(opacity),
    remove: () => props.onRemove?.()
  }

  const onKeydown = useCallback(
    (event: React.KeyboardEvent) => {
      if (!interactive) return
      const amount = positionStep * (event.shiftKey ? 10 : 1)
      let nextPosition: number | undefined
      if (event.code === 'ArrowLeft' || event.code === 'ArrowDown')
        nextPosition = positionPercent - amount
      else if (event.code === 'ArrowRight' || event.code === 'ArrowUp')
        nextPosition = positionPercent + amount
      else if (event.code === 'Home') nextPosition = 0
      else if (event.code === 'End') nextPosition = 100
      else if ((event.code === 'Delete' || event.code === 'Backspace') && removable) {
        event.preventDefault()
        event.stopPropagation()
        actions.remove()
        return
      }
      if (nextPosition === undefined) return
      event.preventDefault()
      event.stopPropagation()
      actions.updatePosition(Math.max(0, Math.min(100, nextPosition)))
    },
    [interactive, positionStep, positionPercent, removable, actions]
  )

  const Comp = asChild ? Slot : Component

  const renderedChildren =
    typeof children === 'function'
      ? children({
          stop,
          index,
          active,
          selected: active,
          dragging,
          positionPercent,
          opacityPercent,
          hex,
          css,
          actions
        })
      : children

  return (
    <Comp
      data-selected={active ? '' : undefined}
      data-dragging={dragging ? '' : undefined}
      role={interactive ? 'slider' : undefined}
      tabIndex={interactive ? 0 : undefined}
      aria-label={interactive ? accessibleLabel : undefined}
      aria-valuemin={interactive ? 0 : undefined}
      aria-valuemax={interactive ? 100 : undefined}
      aria-valuenow={interactive ? positionPercent : undefined}
      aria-valuetext={interactive ? `${positionPercent}%` : undefined}
      data-slot="stop"
      onClick={actions.select}
      onFocus={actions.select}
      onKeyDown={onKeydown}
      {...(props as any)}
    >
      {renderedChildren}
    </Comp>
  )
}

export default GradientEditorStop
