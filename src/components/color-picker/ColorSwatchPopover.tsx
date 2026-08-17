import React, { useCallback } from 'react'
import * as Popover from '@radix-ui/react-popover'
import { colorToCSS, colorToHex, colorToHexRaw, parseColor } from '@openweave/core/color'
import type { Color } from '@openweave/scene-graph/primitives'

import { ColorPicker } from './ColorPicker'
import type { OkHCLFieldControls } from '@/components/color-picker-panel/context'

export interface ColorSwatchPopoverProps {
  color: Color
  onChange: (color: Color) => void
  label?: string
  /**
   * Shows an editable hex field next to the swatch instead of static hex
   * text. Defaults to false so every existing caller keeps its current
   * (non-editable) look.
   */
  editable?: boolean
  /** Per-slot OkHCL bridge, forwarded to the popover's `ColorPicker`. */
  okhcl?: OkHCLFieldControls | null
}

/**
 * A color swatch that opens a color-picker popover when clicked. The swatch and
 * label reflect the current color; edits are emitted live via {@link onChange}.
 */
export function ColorSwatchPopover({
  color,
  onChange,
  label,
  editable = false,
  okhcl = null
}: ColorSwatchPopoverProps) {
  const onHexChange = useCallback(
    (raw: string) => {
      const value = raw.trim()
      if (value.length === 0) return
      const parsed = parseColor(value.startsWith('#') ? value : `#${value}`)
      onChange({ ...parsed, a: color.a })
    },
    [color.a, onChange]
  )

  const swatchStyle = { backgroundColor: colorToCSS(color) }

  const popoverContent = (
    <Popover.Portal>
      <Popover.Content
        side="left"
        align="start"
        sideOffset={8}
        data-picker-content
        className="z-50 rounded-lg border border-border bg-surface p-3 shadow-lg"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <ColorPicker color={color} onChange={onChange} okhcl={okhcl} />
      </Popover.Content>
    </Popover.Portal>
  )

  // Editable mode needs the hex text to live in a real <input>, which can't
  // nest inside the trigger <button> (invalid HTML, and the input would
  // fight the button for clicks). So the swatch becomes its own small
  // trigger button with the input as a sibling -- matching how the old Vue
  // `ColorInput.vue` laid these out. Non-editable callers keep the original
  // single-button structure untouched below.
  if (editable) {
    return (
      <div className="flex flex-1 items-center gap-1.5">
        <Popover.Root>
          <Popover.Trigger asChild>
            <button
              type="button"
              aria-label="Edit color"
              className="size-4 shrink-0 cursor-pointer rounded border border-border p-0 outline-none focus-visible:ring-2 focus-visible:ring-primary"
              style={swatchStyle}
            />
          </Popover.Trigger>
          {popoverContent}
        </Popover.Root>
        <input
          type="text"
          data-test-id="color-hex-input"
          className="min-w-0 flex-1 truncate border-none bg-transparent font-mono text-xs text-surface outline-none"
          value={colorToHexRaw(color)}
          maxLength={6}
          onChange={(e) => onHexChange(e.target.value)}
        />
      </div>
    )
  }

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          type="button"
          aria-label="Edit color"
          className="flex flex-1 items-center gap-2 text-left outline-none"
        >
          <span
            className="size-4 rounded border border-border shrink-0"
            style={swatchStyle}
          />
          <span className="flex-1 text-[11px] truncate uppercase text-surface">
            {label ?? colorToHex(color).slice(1)}
          </span>
        </button>
      </Popover.Trigger>
      {popoverContent}
    </Popover.Root>
  )
}

export default ColorSwatchPopover
