import React from 'react'
import * as Popover from '@radix-ui/react-popover'
import { colorToCSS } from '@openweave/core/color'
import type { Color } from '@openweave/scene-graph/primitives'

import ColorPicker from '@/components/color-picker/ColorPicker'
import type { OkHCLFieldControls } from '@/components/color-picker-panel/context'

export interface PaintSwatchPopoverProps {
  color: Color
  label: string
  onChange: (color: Color) => void
  /** Fires on open/close; close is the commit point for the editing session. */
  onOpenChange?: (open: boolean) => void
  onCancel?: () => void
  okhcl?: OkHCLFieldControls | null
  /** Optional override for the trigger's `data-test-id`, for callers that need a stable e2e hook. */
  dataTestId?: string
}

/**
 * Swatch-only color popover for paint rows. Unlike ColorSwatchPopover it
 * exposes `onOpenChange`, so callers can batch every change made while the
 * popover is open into a single undo entry and commit it on close.
 */
export function PaintSwatchPopover({
  color,
  label,
  onChange,
  onOpenChange,
  onCancel,
  okhcl,
  dataTestId
}: PaintSwatchPopoverProps) {
  return (
    <Popover.Root onOpenChange={onOpenChange}>
      <Popover.Trigger asChild>
        <button
          type="button"
          aria-label={label}
          data-property="paint-swatch"
          data-test-id={dataTestId}
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
          onEscapeKeyDown={() => {
            if (onCancel) {
              onCancel()
            }
          }}
        >
          <ColorPicker color={color} onChange={onChange} okhcl={okhcl} />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}

export default PaintSwatchPopover
