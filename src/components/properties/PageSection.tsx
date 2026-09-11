import React from 'react'

import { useI18n, useSceneComputed } from '@openweave/react'
import type { Color } from '@openweave/scene-graph/primitives'

import { getActiveEditorStore } from '@/app/editor/active-store'
import ColorSwatchPopover from '@/components/color-picker/ColorSwatchPopover'
import NumberField from '@/components/inputs/NumberField'
import PanelSection from '@/components/ui/panel/PanelSection'

export default function PageSection() {
  const editor = getActiveEditorStore()
  const { panels } = useI18n()

  // Bridged read: `state.pageColor` is Vue-reactive store state — a plain
  // render-body read never re-renders this panel, leaving the swatch/hex
  // stale after the background changes (the canvas repaints, the panel not).
  const pageColor = useSceneComputed<Color>(() => ({ ...editor.state.pageColor }))

  const updatePageColor = (color: Color) => {
    editor.setPageColor(color)
  }

  const updatePageAlpha = (alpha: number) => {
    editor.setPageColor({ ...editor.state.pageColor, a: alpha })
  }

  return (
    <PanelSection label={panels.page}>
      <div className="flex flex-col gap-2 relative group">
        <div className="flex items-center gap-1.5">
          <div className="flex-1 flex items-center gap-1 bg-input/50 rounded px-1.5 py-1 border border-border focus-within:border-accent transition-colors">
            <ColorSwatchPopover color={pageColor} onChange={updatePageColor} editable={true} />
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
