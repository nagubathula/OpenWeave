import React, { useState } from 'react'
import { useI18n } from '@openweave/react'
import { getActiveEditorStore } from '@/app/editor/active-store'
import type { Color } from '@openweave/scene-graph/primitives'
import { colorToHexRaw, parseColor } from '@openweave/core/color'

import PanelSection from '@/components/ui/panel/PanelSection'
import ColorSwatchPopover from '@/components/color-picker/ColorSwatchPopover'
import NumberField from '@/components/inputs/NumberField'

export default function PageSection() {
  const editor = getActiveEditorStore()
  const { panels } = useI18n()

  const pageColor = editor.state.pageColor
  const [hexDraft, setHexDraft] = useState<string | null>(null)

  const updatePageColor = (color: Color) => {
    editor.setPageColor(color)
  }

  const updatePageAlpha = (alpha: number) => {
    editor.setPageColor({ ...pageColor, a: alpha })
  }

  const commitHexDraft = () => {
    if (hexDraft !== null) updatePageColor({ ...parseColor(`#${hexDraft}`), a: pageColor.a })
    setHexDraft(null)
  }

  return (
    <PanelSection label={panels.page}>
      <div className="flex flex-col gap-2 relative group">
        <div className="flex items-center gap-1.5">
          <div className="flex-1 flex items-center gap-1 bg-input/50 rounded px-1.5 py-1 border border-border focus-within:border-accent transition-colors">
            <ColorSwatchPopover
              color={pageColor}
              onChange={updatePageColor}
            />
            <input
              type="text"
              aria-label={panels.pageBackground}
              className="w-14 bg-transparent outline-none text-xs text-surface font-mono uppercase"
              value={hexDraft ?? colorToHexRaw(pageColor)}
              onChange={(e) => setHexDraft(e.target.value)}
              onBlur={commitHexDraft}
              onKeyDown={(e) => {
                if (e.key === 'Enter') e.currentTarget.blur()
                if (e.key === 'Escape') setHexDraft(null)
              }}
            />
            <div className="w-[1px] h-3 bg-border mx-1"></div>
            <div className="w-14">
              <NumberField
                ariaLabel={panels.opacity}
                value={Math.round((pageColor.a ?? 1) * 100)}
                min={0}
                max={100}
                suffix="%"
                onChange={(v) => updatePageAlpha(v / 100)}
                onCommit={(v) => updatePageAlpha(v / 100)}
              />
            </div>
          </div>
        </div>
      </div>
    </PanelSection>
  )
}
