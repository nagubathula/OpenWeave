import React from 'react'

import { useColorPickerPanelContext } from './context'

/**
 * Hex quick-edit, always visible regardless of which format tab is active
 * (hex is a universal representation, not tied to RGB/HSL/HSB/OkHCL).
 */
export function HexField() {
  const ctx = useColorPickerPanelContext()

  return (
    <label className="flex flex-1 items-center gap-1 rounded border border-border bg-input/50 px-2 py-1">
      <span className="text-[10px] text-muted">#</span>
      <input
        type="text"
        aria-label="Hex color"
        data-test-id="color-hex-input"
        className="w-full min-w-0 bg-transparent text-surface uppercase outline-none"
        value={ctx.hex}
        onChange={(event) => ctx.updateHex(event.target.value)}
      />
    </label>
  )
}

export default HexField
