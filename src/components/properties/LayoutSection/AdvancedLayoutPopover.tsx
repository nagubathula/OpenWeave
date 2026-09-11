import * as Popover from '@radix-ui/react-popover'
import { SlidersHorizontal } from 'lucide-react'
import React, { useState } from 'react'

import { useLayoutControlsContext } from '@openweave/react'
import type { LayoutDirection } from '@openweave/scene-graph'

import { AppSelect } from '@/components/ui/AppSelect'
import { AppSwitch } from '@/components/ui/AppSwitch'
import IconButton from '@/components/ui/IconButton'
import { usePopoverUI } from '@/components/ui/popover'

export default function AdvancedLayoutPopover() {
  const [open, setOpen] = useState(false)
  const ctx = useLayoutControlsContext()
  const { node, editor } = ctx
  const popoverCls = usePopoverUI({ content: 'isolate z-[51] w-64 p-3' })

  const isWrap = node.layoutWrap === 'WRAP'

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <IconButton
          label="Advanced layout"
          size="md"
          active={open}
          data-test-id="advanced-layout-trigger"
        >
          <SlidersHorizontal className="size-3.5" />
        </IconButton>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          data-test-id="advanced-layout-popover"
          side="left"
          sideOffset={8}
          align="start"
          collisionPadding={16}
          avoidCollisions
          className={popoverCls.content}
        >
          <div className="flex flex-col gap-3">
            <div className="text-[11px] font-medium uppercase tracking-wider text-muted">
              Advanced layout
            </div>

            {/* Layout direction */}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] text-muted">Direction</label>
              <AppSelect
                value={node.layoutDirection ?? 'AUTO'}
                options={[
                  { value: 'AUTO', label: 'Auto' },
                  { value: 'LTR', label: 'Left to right (LTR)' },
                  { value: 'RTL', label: 'Right to left (RTL)' }
                ]}
                onValueChange={(val) => ctx.setLayoutDirection(val as LayoutDirection)}
              />
            </div>

            {/* Canvas stacking */}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] text-muted">Canvas stacking</label>
              <AppSelect
                value={node.itemReverseZIndex ? 'LAST_ON_TOP' : 'FIRST_ON_TOP'}
                options={[
                  { value: 'FIRST_ON_TOP', label: 'First on top' },
                  { value: 'LAST_ON_TOP', label: 'Last on top' }
                ]}
                onValueChange={(val) =>
                  editor.updateNodeWithUndo(
                    node.id,
                    { itemReverseZIndex: val === 'LAST_ON_TOP' },
                    'Change canvas stacking'
                  )
                }
              />
            </div>

            {/* Strokes */}
            <label className="flex items-center justify-between gap-1.5 text-[11px] text-muted">
              <span>Strokes included in layout</span>
              <AppSwitch
                value={node.strokesIncludedInLayout}
                onValueChange={(val: boolean) =>
                  editor.updateNodeWithUndo(
                    node.id,
                    { strokesIncludedInLayout: val },
                    'Change strokes included in layout'
                  )
                }
              />
            </label>

            {/* In WRAP mode: Align content */}
            {isWrap && (
              <div className="flex flex-col gap-1 border-t border-border pt-2">
                <label className="text-[11px] text-muted">Align content</label>
                <AppSelect
                  value={node.counterAxisAlignContent ?? 'AUTO'}
                  options={[
                    { value: 'AUTO', label: 'Packed (Auto)' },
                    { value: 'SPACE_BETWEEN', label: 'Space between' }
                  ]}
                  onValueChange={(val) =>
                    editor.updateNodeWithUndo(
                      node.id,
                      { counterAxisAlignContent: val as 'AUTO' | 'SPACE_BETWEEN' },
                      'Change align content'
                    )
                  }
                />
              </div>
            )}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
