import { Columns2, LayoutGrid, Move, Rows2, WrapText } from 'lucide-react'
import React from 'react'
import { tv } from 'tailwind-variants'

import { useI18n, useLayoutControlsContext } from '@openweave/react'
import type { LayoutMode } from '@openweave/scene-graph'

import IconButton from '@/components/ui/IconButton'
import Tip from '@/components/ui/Tip'
import segmentedControlTheme from '@/theme/segmented-control'

const segmentedControl = tv(segmentedControlTheme)

const LAYOUT_MODE_ICONS: Record<LayoutMode, React.ReactNode> = {
  NONE: <Move className="size-3.5" />,
  VERTICAL: <Rows2 className="size-3.5" />,
  HORIZONTAL: <Columns2 className="size-3.5" />,
  GRID: <LayoutGrid className="size-3.5" />
}

/**
 * Flow selector (Freeform/Vertical/Horizontal/Grid) shown for any container
 * node regardless of its current layout mode, plus the wrap toggle for flex
 * containers. Always visible for containers — this is what lets a freeform
 * frame switch directly into auto layout.
 *
 * Hand-rolled with plain buttons (reusing the shared segmented-control
 * theme for visuals) rather than the shared SegmentedControl primitive,
 * which renders role="radio" items — the auto-layout E2E suite exercises
 * these as role="button".
 */
export default function AutoLayoutControls() {
  const ctx = useLayoutControlsContext()
  const { panels } = useI18n()
  const { node, editor, isFlex } = ctx
  const styles = segmentedControl({ size: 'sm' })

  const layoutModes: { value: LayoutMode; label: string }[] = [
    { value: 'NONE', label: panels.freeform },
    { value: 'VERTICAL', label: panels.layoutVertical },
    { value: 'HORIZONTAL', label: panels.layoutHorizontal },
    { value: 'GRID', label: panels.layoutGrid }
  ]

  return (
    <div>
      <label className="mb-1 block text-[11px] text-muted">{panels.flow}</label>
      <div className="flex items-center gap-1.5">
        <div role="group" aria-label={panels.flow} className={`${styles.root()} min-w-0 flex-1`}>
          {layoutModes.map((mode) => (
            <Tip key={mode.value} label={mode.label}>
              <button
                type="button"
                aria-label={mode.label}
                data-state={node.layoutMode === mode.value ? 'on' : 'off'}
                className={styles.item()}
                onClick={() => editor.setLayoutMode(node.id, mode.value)}
              >
                {LAYOUT_MODE_ICONS[mode.value]}
              </button>
            </Tip>
          ))}
        </div>
        {isFlex && (
          <IconButton
            label={panels.layoutWrap}
            size="md"
            active={node.layoutWrap === 'WRAP'}
            onClick={() =>
              ctx.updateProp('layoutWrap', node.layoutWrap === 'WRAP' ? 'NO_WRAP' : 'WRAP')
            }
          >
            <WrapText className="size-3.5" />
          </IconButton>
        )}
      </div>
    </div>
  )
}
