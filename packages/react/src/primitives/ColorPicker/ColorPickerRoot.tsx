import React, { useMemo, useCallback } from 'react'
import * as Popover from '@radix-ui/react-popover'
import { colorToCSS } from '@openweave/core/color'
import type { Color } from '@openweave/scene-graph/primitives'

export interface ColorPickerUI {
  content?: string
  swatch?: string
}

export interface ColorPickerRootProps {
  color: Color
  label?: string
  ui?: ColorPickerUI
  onUpdate?: (color: Color) => void
  onOpenChange?: (open: boolean) => void
  onCancel?: () => void
  trigger?: React.ReactNode | ((props: { style: React.CSSProperties }) => React.ReactNode)
  children?: React.ReactNode | ((props: { color: Color }) => React.ReactNode)
}

export function ColorPickerRoot({
  color,
  label = 'Edit color',
  ui,
  onUpdate,
  onOpenChange,
  onCancel,
  trigger,
  children
}: ColorPickerRootProps) {
  const swatchBg = useMemo(() => colorToCSS(color), [color])

  const cancelFromEscape = useCallback((event: KeyboardEvent) => {
    event.stopPropagation()
    onCancel?.()
  }, [onCancel])

  const renderedTrigger = typeof trigger === 'function' 
    ? trigger({ style: { background: swatchBg } }) 
    : trigger ?? (
      <button
        type="button"
        aria-label={label}
        className={ui?.swatch}
        style={{ background: swatchBg }}
      />
    )

  const renderedChildren = typeof children === 'function' ? children({ color }) : children

  return (
    <Popover.Root onOpenChange={onOpenChange}>
      <Popover.Trigger asChild>
        {renderedTrigger}
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          className={ui?.content}
          sideOffset={4}
          side="left"
          data-picker-content
          onEscapeKeyDown={cancelFromEscape}
        >
          {renderedChildren}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}

export default ColorPickerRoot
