import React from 'react'
import * as Popover from '@radix-ui/react-popover'
import { colorToCSS, colorToHex } from '@openweave/core/color'
import type { Color } from '@openweave/scene-graph/primitives'
import { ColorPicker } from './ColorPicker'

export interface ColorSwatchPopoverProps {
  color: Color
  onChange: (color: Color) => void
  label?: string
}

/**
 * A color swatch that opens a color-picker popover when clicked. The swatch and
 * label reflect the current color; edits are emitted live via {@link onChange}.
 */
export function ColorSwatchPopover({ color, onChange, label }: ColorSwatchPopoverProps) {
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          type="button"
          className="flex flex-1 items-center gap-2 text-left outline-none"
        >
          <span
            className="size-4 rounded border border-border shrink-0"
            style={{ backgroundColor: colorToCSS(color) }}
          />
          <span className="flex-1 text-[11px] truncate uppercase text-surface">
            {label ?? colorToHex(color).slice(1)}
          </span>
        </button>
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

export default ColorSwatchPopover
