import React, { useState } from 'react'

import { useEditor, useI18n } from '@openweave/react'

import { FRAME_PRESET_CATEGORIES } from '@/app/editor/frame-presets'

/**
 * Preset canvas-size picker shown while the Frame tool is armed. Category
 * buttons expand their preset grid additively (Phone is expanded by
 * default) rather than switching an exclusive active category, so a preset
 * from an earlier-expanded category stays clickable after expanding another.
 * Clicking a preset creates a new FRAME at the preset's dimensions, selects
 * it, and arms the Select tool — matching `editor.createFrameFromPreset`.
 */
export default function FramePresetsSection() {
  const editor = useEditor()
  const { panels } = useI18n()
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set([FRAME_PRESET_CATEGORIES[0].id])
  )

  const toggleCategory = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <section
      aria-label={panels.frame}
      className="space-y-2 border-b border-border pb-3"
      data-test-id="frame-presets-section"
    >
      <div className="text-[11px] font-semibold text-muted uppercase tracking-wider">
        {panels.frame}
      </div>
      <div className="flex flex-wrap gap-1">
        {FRAME_PRESET_CATEGORIES.map((c) => (
          <button
            key={c.id}
            type="button"
            aria-label={panels[c.labelKey] as string}
            aria-pressed={expanded.has(c.id)}
            className={`rounded px-2 py-1 text-[11px] ${
              expanded.has(c.id)
                ? 'bg-active text-surface'
                : 'text-muted hover:bg-hover hover:text-surface'
            }`}
            onClick={() => toggleCategory(c.id)}
          >
            {panels[c.labelKey] as string}
          </button>
        ))}
      </div>
      <div className="max-h-64 overflow-y-auto space-y-2">
        {FRAME_PRESET_CATEGORIES.filter((c) => expanded.has(c.id)).map((category) => (
          <div key={category.id} className="grid grid-cols-2 gap-1.5">
            {category.presets.map((preset) => (
              <button
                key={preset.id}
                type="button"
                aria-label={`${preset.name} ${preset.width} × ${preset.height}`}
                className="flex flex-col items-start gap-0.5 rounded border border-border bg-input/50 px-2 py-1.5 text-left hover:bg-hover"
                onClick={() =>
                  editor.createFrameFromPreset({
                    name: preset.name,
                    width: preset.width,
                    height: preset.height
                  })
                }
              >
                <span className="truncate text-[11px] text-surface">{preset.name}</span>
                <span className="text-[10px] text-muted">
                  {preset.width} × {preset.height}
                </span>
              </button>
            ))}
          </div>
        ))}
      </div>
    </section>
  )
}
