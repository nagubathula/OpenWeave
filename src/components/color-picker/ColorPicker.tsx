import React from 'react'
import type { Color } from '@openweave/scene-graph/primitives'

import ColorPickerPanel from '@/components/color-picker-panel/ColorPickerPanel'
import type { OkHCLFieldControls } from '@/components/color-picker-panel/context'

export interface ColorPickerProps {
  color: Color
  onChange: (color: Color) => void
  /**
   * Per-slot OkHCL bridge (see `src/components/properties/paint/okhcl.ts`).
   * Optional -- without it the OkHCL format tab is still fully functional,
   * just self-contained (derived from `color`, not persisted separately).
   */
  okhcl?: OkHCLFieldControls | null
}

/**
 * Full color editor popover content: saturation/brightness area, hue/alpha
 * sliders, hex field, and a RGB/HSL/HSB/OkHCL format switcher with each
 * format's own numeric fields and accessible sliders.
 */
export function ColorPicker({ color, onChange, okhcl = null }: ColorPickerProps) {
  return (
    <div className="w-56 text-xs">
      <ColorPickerPanel color={color} onUpdate={onChange} okhcl={okhcl} />
    </div>
  )
}

export default ColorPicker
