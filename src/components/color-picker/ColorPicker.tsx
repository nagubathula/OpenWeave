import { Plus, X } from 'lucide-react'
import React, { useState } from 'react'

import { useI18n, useOptionalBindableValue } from '@openweave/react'
import type { Color } from '@openweave/scene-graph/primitives'

import ColorPickerPanel from '@/components/color-picker-panel/ColorPickerPanel'
import type { OkHCLFieldControls } from '@/components/color-picker-panel/context'
import ColorLibraries from '@/components/color-picker/ColorLibraries'
import DocumentColors from '@/components/color-picker/DocumentColors'
import Tip from '@/components/ui/Tip'

export interface ColorPickerProps {
  color: Color
  onChange: (color: Color) => void
  /**
   * Per-slot OkHCL bridge (see `src/components/properties/paint/okhcl.ts`).
   * Optional -- without it the OkHCL format tab is still fully functional,
   * just self-contained (derived from `color`, not persisted separately).
   */
  okhcl?: OkHCLFieldControls | null
  /** Optional callback to close the host popover */
  onClose?: () => void
  /** Initial tab to display */
  initialTab?: 'custom' | 'libraries'
}

/**
 * Full color editor popover content: saturation/brightness area, hue/alpha
 * sliders, hex field, format switcher, and a Figma-compatible Libraries tab
 * for browsing, searching, and binding color variables and shared styles.
 */
export function ColorPicker({
  color,
  onChange,
  okhcl = null,
  onClose,
  initialTab
}: ColorPickerProps) {
  const { panels, dialogs } = useI18n()
  const bindable = useOptionalBindableValue<Color>()
  const isBound = bindable?.state === 'bound'

  const [tab, setTab] = useState<'custom' | 'libraries'>(
    () => initialTab ?? (isBound ? 'libraries' : 'custom')
  )
  const [creating, setCreating] = useState(false)

  return (
    <div className="w-64 text-xs" data-slot="color-picker-root">
      {/* Top Header with Custom / Libraries tabs & actions */}
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-border">
        <div className="flex items-center gap-1 rounded bg-input/40 p-0.5 text-xs">
          <button
            type="button"
            data-test-id="color-tab-custom"
            className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
              tab === 'custom'
                ? 'bg-panel text-surface font-medium shadow-xs'
                : 'text-muted hover:text-surface'
            }`}
            onClick={() => setTab('custom')}
          >
            Custom
          </button>
          <button
            type="button"
            data-test-id="color-tab-libraries"
            className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
              tab === 'libraries'
                ? 'bg-panel text-surface font-medium shadow-xs'
                : 'text-muted hover:text-surface'
            }`}
            onClick={() => setTab('libraries')}
          >
            Libraries
          </button>
        </div>

        <div className="flex items-center gap-1">
          <Tip label={panels.create}>
            <button
              type="button"
              aria-label={panels.create}
              data-test-id="color-library-create-btn"
              className="flex size-6 items-center justify-center rounded text-muted hover:text-surface hover:bg-hover transition-colors cursor-pointer"
              onClick={() => {
                setTab('libraries')
                setCreating(true)
              }}
            >
              <Plus className="size-3.5" />
            </button>
          </Tip>

          {onClose && (
            <Tip label={dialogs.close}>
              <button
                type="button"
                aria-label={dialogs.close}
                data-test-id="color-picker-close-btn"
                className="flex size-6 items-center justify-center rounded text-muted hover:text-surface hover:bg-hover transition-colors cursor-pointer"
                onClick={onClose}
              >
                <X className="size-3.5" />
              </button>
            </Tip>
          )}
        </div>
      </div>

      {/* Tab contents */}
      {tab === 'custom' ? (
        <div data-slot="custom-color-tab">
          <ColorPickerPanel color={color} onUpdate={onChange} okhcl={okhcl} />
          <DocumentColors onPick={onChange} />
        </div>
      ) : (
        <div data-slot="libraries-color-tab">
          <ColorLibraries
            color={color}
            onChange={onChange}
            creating={creating}
            onCreatingChange={setCreating}
          />
        </div>
      )}
    </div>
  )
}

export default ColorPicker
