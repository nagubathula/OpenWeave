/* eslint-disable openweave/no-hardcoded-tip-labels */
import { createLucideIcon } from 'lucide-react'
import React from 'react'

import { useI18n, useLayoutControlsContext } from '@openweave/react'
import type { LayoutAlign, LayoutCounterAlign } from '@openweave/scene-graph'

import AdvancedLayoutPopover from '@/components/properties/LayoutSection/AdvancedLayoutPopover'
import FieldSelectMenu from '@/components/properties/LayoutSection/FieldSelectMenu'
import VariableNumberField from '@/components/properties/LayoutSection/VariableNumberField'
import Tip from '@/components/ui/Tip'

const GapIcon = createLucideIcon('GapIcon', [
  ['path', { d: 'M2 3v8M12 3v8M5 7h4M5 5l-2 2 2 2M9 5l2 2-2 2', key: 'p1' }]
])

const GapVerticalIcon = createLucideIcon('GapVerticalIcon', [
  ['path', { d: 'M3 2h8M3 12h8M7 5v4M5 5l2-2 2 2M5 9l2 2 2-2', key: 'p1' }]
])

const GapAutoVerticalIcon = createLucideIcon('GapAutoVerticalIcon', [
  ['path', { d: 'M2.5 4.5V3h9v1.5M5 7h4M2.5 9.5V11h9V9.5', key: 'p1' }]
])

const GapAutoHorizontalIcon = createLucideIcon('GapAutoHorizontalIcon', [
  ['path', { d: 'M4.5 2.5H3v9h1.5M7 5v4M9.5 2.5H11v9H9.5', key: 'p1' }]
])

const FIXED_TOOLTIPS = [
  ['Top left', 'Top center', 'Top right'],
  ['Left', 'Center', 'Right'],
  ['Bottom left', 'Bottom center', 'Bottom right']
]

function getAlignmentTooltip(
  isGapAuto: boolean,
  isVertical: boolean,
  row: number,
  col: number
): string {
  if (isGapAuto) {
    if (isVertical) {
      if (col === 0) return 'Align left'
      if (col === 1) return 'Align center'
      return 'Align right'
    }
    if (row === 0) return 'Align top'
    if (row === 1) return 'Align center'
    return 'Align bottom'
  }
  return FIXED_TOOLTIPS[row]?.[col] ?? 'Align'
}

interface AlignmentCellGlyphProps {
  isGapAuto: boolean
  isVertical: boolean
  row: number
  col: number
  active: boolean
}

function AlignmentCellGlyph({ isGapAuto, isVertical, row, col, active }: AlignmentCellGlyphProps) {
  if (!active) {
    return (
      <span className="size-[2.5px] rounded-full bg-muted/40 transition-colors group-hover:bg-muted" />
    )
  }

  if (isGapAuto) {
    if (isVertical) {
      const isMiddle = row === 1
      return <span className={`h-[1.5px] rounded-full bg-accent ${isMiddle ? 'w-[7px]' : 'w-3'}`} />
    }
    const isMiddle = col === 1
    return <span className={`w-[1.5px] rounded-full bg-accent ${isMiddle ? 'h-[7px]' : 'h-3'}`} />
  }

  if (isVertical) {
    const alignClass = col === 0 ? 'items-start' : col === 2 ? 'items-end' : 'items-center'
    return (
      <div className={`flex w-3 flex-col gap-[2px] ${alignClass}`}>
        <span className="h-[1.5px] w-full rounded-full bg-accent" />
        <span className="h-[1.5px] w-[70%] rounded-full bg-accent" />
        <span className="h-[1.5px] w-[40%] rounded-full bg-accent" />
      </div>
    )
  }

  const alignClass = row === 0 ? 'items-start' : row === 2 ? 'items-end' : 'items-center'
  return (
    <div className={`flex h-3 flex-row gap-[2px] ${alignClass}`}>
      <span className="w-[1.5px] h-full rounded-full bg-accent" />
      <span className="w-[1.5px] h-[70%] rounded-full bg-accent" />
      <span className="w-[1.5px] h-[40%] rounded-full bg-accent" />
    </div>
  )
}

/**
 * Side-by-side Alignment (3x3 grid) and Gap controls matching Figma UI3.
 */
export default function FlexControls() {
  const ctx = useLayoutControlsContext()
  const { panels } = useI18n()
  const { node } = ctx
  const isVertical = node.layoutMode === 'VERTICAL'

  function isCellActive(
    row: number,
    col: number,
    primary: LayoutAlign,
    counter: LayoutCounterAlign
  ) {
    if (ctx.gapAuto) {
      const activeCounter =
        node.counterAxisAlign === 'MIN' ? 0 : node.counterAxisAlign === 'CENTER' ? 1 : 2
      return isVertical ? col === activeCounter : row === activeCounter
    }
    return node.primaryAxisAlign === primary && node.counterAxisAlign === counter
  }

  function handleCellClick(
    row: number,
    col: number,
    primary: LayoutAlign,
    counter: LayoutCounterAlign
  ) {
    if (ctx.gapAuto) {
      const targetIndex = isVertical ? col : row
      const targetCounter: LayoutCounterAlign =
        targetIndex === 0 ? 'MIN' : targetIndex === 1 ? 'CENTER' : 'MAX'
      ctx.setAlignment('SPACE_BETWEEN', targetCounter)
    } else {
      ctx.setAlignment(primary, counter)
    }
  }

  const gapModeOptions = [
    { value: 'FIXED', label: String(Math.round(node.itemSpacing)) },
    { value: 'AUTO', label: panels.auto }
  ]

  const gapAutoIcon = isVertical ? (
    <GapAutoVerticalIcon className="size-3.5" />
  ) : (
    <GapAutoHorizontalIcon className="size-3.5" />
  )
  const gapFixedIcon = isVertical ? (
    <GapVerticalIcon className="size-3.5" />
  ) : (
    <GapIcon className="size-3.5" />
  )
  const crossGapIcon = isVertical ? (
    <GapIcon className="size-3.5" />
  ) : (
    <GapVerticalIcon className="size-3.5" />
  )

  return (
    <div className="mt-2 grid grid-cols-2 items-start gap-2">
      {/* Left: Alignment 3x3 */}
      <div>
        <label className="mb-1 block text-[11px] text-muted">{panels.alignment}</label>
        <div
          data-test-id="layout-alignment-grid"
          className="flex h-[52px] w-full items-center justify-center rounded-md border border-border bg-input/40 p-1 focus-within:border-accent hover:border-border-hover transition-colors"
        >
          <div className="grid h-full w-full grid-cols-3 grid-rows-3 gap-0.5">
            {ctx.alignGrid.map((cell, index) => {
              const row = Math.floor(index / 3)
              const col = index % 3
              const active = isCellActive(row, col, cell.primary, cell.counter)
              const label = getAlignmentTooltip(ctx.gapAuto, isVertical, row, col)

              const cellAlignClass =
                ctx.gapAuto && active
                  ? isVertical
                    ? col === 0
                      ? 'justify-start px-2'
                      : col === 2
                        ? 'justify-end px-2'
                        : 'justify-center'
                    : row === 0
                      ? 'items-start py-1'
                      : row === 2
                        ? 'items-end py-1'
                        : 'items-center'
                  : 'items-center justify-center'

              return (
                <Tip key={`${cell.primary}-${cell.counter}`} label={label}>
                  <button
                    type="button"
                    aria-label={label}
                    data-active={active || undefined}
                    className={`group flex size-full ${cellAlignClass} rounded transition-colors hover:bg-hover/60`}
                    onClick={() => handleCellClick(row, col, cell.primary, cell.counter)}
                  >
                    <AlignmentCellGlyph
                      isGapAuto={ctx.gapAuto}
                      isVertical={isVertical}
                      row={row}
                      col={col}
                      active={active}
                    />
                  </button>
                </Tip>
              )
            })}
          </div>
        </div>
      </div>

      {/* Right: Gap & Advanced Layout */}
      <div>
        <label className="mb-1 block text-[11px] text-muted">{panels.gap}</label>
        <div className="flex items-center gap-1.5">
          {ctx.gapAuto ? (
            <div
              data-test-id="layout-gap-input"
              className="flex h-6 min-w-0 flex-1 items-center justify-between rounded border border-transparent bg-panel-field px-1.5 text-[11px] text-surface hover:bg-panel-field-hover"
            >
              <div className="flex min-w-0 items-center gap-1.5">
                <span className="flex shrink-0 items-center text-muted">{gapAutoIcon}</span>
                <span className="truncate">{panels.auto}</span>
              </div>
              <FieldSelectMenu
                dataTestId="layout-gap-menu"
                ariaLabel={panels.gap}
                value="AUTO"
                seamless
                onValueChange={(value) => ctx.setGapAuto(value === 'AUTO')}
                options={gapModeOptions}
              />
            </div>
          ) : (
            <VariableNumberField
              dataTestId="layout-gap-input"
              className="min-w-0 flex-1"
              icon={gapFixedIcon}
              value={Math.round(node.itemSpacing)}
              min={0}
              nodeId={node.id}
              bindingPath="itemSpacing"
              onChange={(v) => ctx.updateProp('itemSpacing', v)}
              onCommit={(v, p) => ctx.commitProp('itemSpacing', v, p)}
              trailing={
                <FieldSelectMenu
                  dataTestId="layout-gap-menu"
                  ariaLabel={panels.gap}
                  value="FIXED"
                  seamless
                  onValueChange={(value) => ctx.setGapAuto(value === 'AUTO')}
                  options={gapModeOptions}
                />
              }
            />
          )}

          <AdvancedLayoutPopover />
        </div>

        {/* In WRAP mode: Cross-axis gap */}
        {node.layoutWrap === 'WRAP' && (
          <div className="mt-1.5">
            <VariableNumberField
              dataTestId="layout-cross-gap-input"
              className="w-full"
              icon={crossGapIcon}
              value={Math.round(node.counterAxisSpacing)}
              min={0}
              nodeId={node.id}
              bindingPath="counterAxisSpacing"
              onChange={(v) => ctx.updateProp('counterAxisSpacing', v)}
              onCommit={(v, p) => ctx.commitProp('counterAxisSpacing', v, p)}
            />
          </div>
        )}
      </div>
    </div>
  )
}
