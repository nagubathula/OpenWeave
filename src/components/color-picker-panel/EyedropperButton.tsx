import { Pipette } from 'lucide-react'
import React from 'react'

import { useColorPickerPanelContext } from './context'

type EyeDropperCtor = new () => { open: () => Promise<{ sRGBHex: string }> }

function getEyeDropper(): EyeDropperCtor | null {
  if (typeof window === 'undefined') return null
  return (window as { EyeDropper?: EyeDropperCtor }).EyeDropper ?? null
}

/** Native screen color picker (Chromium's EyeDropper API); hidden when unsupported. */
export function EyedropperButton() {
  const ctx = useColorPickerPanelContext()
  const EyeDropper = getEyeDropper()
  if (!EyeDropper) return null

  const pick = async () => {
    try {
      const result = await new EyeDropper().open()
      ctx.updateHex(result.sRGBHex.replace('#', ''))
    } catch {
      // Dismissed with Escape — not an error.
    }
  }

  return (
    <button
      type="button"
      aria-label={ctx.panels.colorEyedropper}
      data-test-id="color-eyedropper"
      className="shrink-0 rounded border border-border p-1.5 text-muted hover:bg-hover hover:text-surface"
      onClick={() => void pick()}
    >
      <Pipette className="size-3.5" />
    </button>
  )
}

export default EyedropperButton
