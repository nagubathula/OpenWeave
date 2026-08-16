import React from 'react'
import { tv } from 'tailwind-variants'
import { useI18n, useLayoutControlsContext } from '@openweave/react'
import type { LayoutAlign, LayoutCounterAlign, LayoutDirection } from '@openweave/scene-graph'
import { AlignHorizontalSpaceBetween, AlignVerticalSpaceBetween, Minus, Plus } from 'lucide-react'

import { AppSelect } from '@/components/ui/AppSelect'
import ClipContentControl from '@/components/properties/LayoutSection/ClipContentControl'
import FieldSelectMenu from '@/components/properties/LayoutSection/FieldSelectMenu'
import PaddingControls from '@/components/properties/LayoutSection/PaddingControls'
import VariableNumberField from '@/components/properties/LayoutSection/VariableNumberField'
import layoutAlignmentTheme from '@/theme/layout-alignment'

const layoutAlignment = tv(layoutAlignmentTheme)

/** Flex-mode controls: direction, gap (fixed/auto/wrap), padding, clip content, alignment. */
export default function FlexControls() {
  const ctx = useLayoutControlsContext()
  const { panels } = useI18n()
  const { node } = ctx
  const alignmentStyles = layoutAlignment()

  function isAlignmentActive(primary: LayoutAlign, counter: LayoutCounterAlign) {
    if (ctx.gapAuto) {
      return node.primaryAxisAlign === 'SPACE_BETWEEN' && node.counterAxisAlign === counter
    }
    return node.primaryAxisAlign === primary && node.counterAxisAlign === counter
  }

  const mainGapIcon =
    node.layoutMode === 'VERTICAL' ? (
      <AlignVerticalSpaceBetween className="size-3.5" />
    ) : (
      <AlignHorizontalSpaceBetween className="size-3.5" />
    )
  const crossGapIcon =
    node.layoutMode === 'VERTICAL' ? (
      <AlignHorizontalSpaceBetween className="size-3.5" />
    ) : (
      <AlignVerticalSpaceBetween className="size-3.5" />
    )

  const directionOptions = [
    { value: 'AUTO', label: panels.auto },
    { value: 'LTR', label: 'LTR' },
    { value: 'RTL', label: 'RTL' }
  ]

  const gapModeOptions = [
    { value: 'FIXED', label: String(Math.round(node.itemSpacing)) },
    { value: 'AUTO', label: panels.auto }
  ]

  return (
    <>
      <div className="mt-2">
        <label className="mb-1 block text-[11px] text-muted">{panels.direction}</label>
        <AppSelect
          value={node.layoutDirection}
          options={directionOptions}
          onValueChange={(value) => ctx.setLayoutDirection(value as LayoutDirection)}
        />
      </div>

      <div className="mt-2 flex items-center gap-1.5">
        {node.layoutWrap === 'WRAP' ? (
          <>
            <VariableNumberField
              dataTestId="layout-gap-input"
              className="min-w-0 flex-1"
              icon={mainGapIcon}
              value={Math.round(node.itemSpacing)}
              min={0}
              nodeId={node.id}
              bindingPath="itemSpacing"
              onChange={(v) => ctx.updateProp('itemSpacing', v)}
              onCommit={(v, p) => ctx.commitProp('itemSpacing', v, p)}
            />
            <VariableNumberField
              dataTestId="layout-cross-gap-input"
              className="min-w-0 flex-1"
              icon={crossGapIcon}
              value={Math.round(node.counterAxisSpacing)}
              min={0}
              nodeId={node.id}
              bindingPath="counterAxisSpacing"
              onChange={(v) => ctx.updateProp('counterAxisSpacing', v)}
              onCommit={(v, p) => ctx.commitProp('counterAxisSpacing', v, p)}
            />
          </>
        ) : ctx.gapAuto ? (
          <div
            data-test-id="layout-gap-input"
            className="group flex h-[26px] min-w-0 flex-1 items-center rounded border border-border bg-input focus-within:border-accent"
          >
            <span className="flex shrink-0 items-center justify-center self-stretch px-[5px] text-muted">
              {mainGapIcon}
            </span>
            <span className="flex-1 truncate text-xs text-surface">{panels.auto}</span>
            <FieldSelectMenu
              dataTestId="layout-gap-menu"
              ariaLabel={panels.gap}
              value="AUTO"
              onValueChange={(value) => ctx.setGapAuto(value === 'AUTO')}
              options={gapModeOptions}
            />
          </div>
        ) : (
          <VariableNumberField
            dataTestId="layout-gap-input"
            className="min-w-0 flex-1"
            icon={mainGapIcon}
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
                onValueChange={(value) => ctx.setGapAuto(value === 'AUTO')}
                options={gapModeOptions}
              />
            }
          />
        )}

        <button
          type="button"
          className="flex size-7 shrink-0 cursor-pointer items-center justify-center rounded border border-border bg-transparent text-muted hover:bg-hover hover:text-surface"
          onClick={ctx.toggleIndividualPadding}
        >
          {ctx.showIndividualPadding || !ctx.hasUniformPadding ? (
            <Minus className="size-3" />
          ) : (
            <Plus className="size-3" />
          )}
        </button>
      </div>

      <PaddingControls />
      <ClipContentControl />

      <div className="mt-2">
        <label className="mb-1 block text-[11px] text-muted">{panels.alignment}</label>
        <div data-test-id="layout-alignment-grid" className={alignmentStyles.grid()}>
          {ctx.alignGrid.map((cell) => {
            const active = isAlignmentActive(cell.primary, cell.counter)
            return (
              <button
                key={`${cell.primary}-${cell.counter}`}
                type="button"
                data-active={active || undefined}
                className={layoutAlignment({ active }).cell()}
                onClick={() =>
                  ctx.setAlignment(ctx.gapAuto ? 'SPACE_BETWEEN' : cell.primary, cell.counter)
                }
              >
                <span className={alignmentStyles.dot()} />
              </button>
            )
          })}
        </div>
      </div>
    </>
  )
}
