import React from 'react'
import * as Popover from '@radix-ui/react-popover'
import { colorToCSS } from '@openweave/core/color'
import type { Color } from '@openweave/scene-graph/primitives'

import ColorPicker from '@/components/color-picker/ColorPicker'

export interface PaintSwatchPopoverProps {
  color: Color
  label: string
  onChange: (color: Color) => void
  /** Fires on open/close; close is the commit point for the editing session. */
  onOpenChange?: (open: boolean) => void
}

/**
 * Swatch-only color popover for paint rows. Unlike ColorSwatchPopover it
 * exposes `onOpenChange`, so callers can batch every change made while the
 * popover is open into a single undo entry and commit it on close.
 */
export function PaintSwatchPopover({ color, label, onChange, onOpenChange }: PaintSwatchPopoverProps) {
  return (
    <Popover.Root onOpenChange={onOpenChange}>
      <Popover.Trigger asChild>
        <button
          type="button"
          aria-label={label}
          data-property="paint-swatch"
          className="size-4 shrink-0 cursor-pointer rounded-sm border border-border p-0"
          style={{ backgroundColor: colorToCSS(color) }}
        />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          side="left"
          align="start"
          sideOffset={8}
          className="z-50 rounded-lg border border-border bg-surface p-3 shadow-lg"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <ColorPicker color={color} onChange={onChange} />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}

export default PaintSwatchPopover
