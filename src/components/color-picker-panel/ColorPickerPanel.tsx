import React from 'react'

import { ColorPickerPanelProvider } from './context'
import type { ColorPickerPanelProps } from './context'
import ColorAreaControl from './ColorAreaControl'
import HueAlphaSliders from './HueAlphaSliders'
import HexField from './HexField'
import FormatControls from './FormatControls'

export type { ColorPickerPanelProps, OkHCLFieldControls } from './context'

/**
 * Full color-editing surface used inside the color picker popover:
 * saturation/brightness area, hue + alpha sliders, a universal hex field,
 * and a RGB/HSL/HSB/OkHCL format switcher with each format's own numeric
 * fields.
 */
export function ColorPickerPanel(props: ColorPickerPanelProps) {
  return (
    <ColorPickerPanelProvider {...props}>
      <div className="flex flex-col gap-2">
        <ColorAreaControl />
        <HueAlphaSliders />
        <HexField />
        <FormatControls />
      </div>
    </ColorPickerPanelProvider>
  )
}

export default ColorPickerPanel
