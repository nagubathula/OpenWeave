import React, { useMemo } from 'react'
import { tv } from 'tailwind-variants'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { Check } from 'lucide-react'

import { menu } from '@/components/ui/menu'
import toolbarTheme from '@/theme/toolbar'
import ToolButton from '@/components/toolbar/ToolButton'

import type { EditorToolDef, Tool } from '@openweave/core/editor'
import type { ToolbarUI, ToolIconMap, ToolLabels } from '@/components/toolbar/types'
import { isToolbarToolActive, toolbarToolTestId } from '@openweave/react'

export function toolbarFlyoutTestId(key: Tool, mobile = false): string {
  return mobile ? `mobile-flyout-${key.toLowerCase()}` : `flyout-${key.toLowerCase()}`
}

export function toolbarFlyoutItemTestId(key: Tool, mobile = false): string {
  return mobile ? `mobile-flyout-item-${key.toLowerCase()}` : `flyout-item-${key.toLowerCase()}`
}

interface ToolFlyoutProps {
  tool: EditorToolDef
  activeTool: Tool
  selectedTool: Tool
  toolIcons: ToolIconMap
  toolLabels: ToolLabels
  toolShortcuts: Record<Tool, string>
  ui?: ToolbarUI
  mobile?: boolean
  children?: (props: { label: string }) => React.ReactNode
  onSelect: (tool: Tool) => void
}

const toolbar = tv(toolbarTheme)

export default function ToolFlyout({
  tool,
  activeTool,
  selectedTool,
  toolIcons,
  toolLabels,
  toolShortcuts,
  ui,
  mobile = false,
  children,
  onSelect
}: ToolFlyoutProps) {
  const triggerActive = isToolbarToolActive(tool, activeTool)
  const styles = toolbar({ active: triggerActive, mobile })

  const flyoutItemClass = useMemo(() => {
    return menu({ justify: 'start' }).item({
      className: toolbar().flyoutItem({ className: ui?.flyoutItem })
    })
  }, [ui?.flyoutItem])

  const labelString = `${toolLabels[selectedTool]} (${tool.shortcut})`
  const SelectedIcon = toolIcons[selectedTool]

  return (
    <div className={styles.flyoutGroup({ className: ui?.flyoutGroup })}>
      {children ? children({ label: labelString }) : (
        <ToolButton
          data-test-id={toolbarToolTestId(selectedTool)}
          icon={SelectedIcon}
          label={toolLabels[selectedTool]}
          active={triggerActive}
          mobile={mobile}
          ui={ui}
          onClick={() => onSelect(selectedTool)}
        />
      )}

      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button
            data-test-id={toolbarFlyoutTestId(tool.key, mobile)}
            data-mobile={mobile || undefined}
            aria-label={`${toolLabels[tool.key]} options`}
            className={styles.flyoutTrigger({ className: ui?.flyoutTrigger })}
          >
            <span className={styles.flyoutTriggerIcon({ className: ui?.flyoutTriggerIcon })}>▼</span>
          </button>
        </DropdownMenu.Trigger>

        <DropdownMenu.Portal>
          <DropdownMenu.Content
            side="top"
            sideOffset={8}
            align="start"
            className={styles.flyoutContent({ className: ui?.flyoutContent })}
          >
            <DropdownMenu.RadioGroup value={selectedTool}>
              {tool.flyout?.map(sub => {
                const SubIcon = toolIcons[sub]
                return (
                  <DropdownMenu.RadioItem
                    key={sub}
                    value={sub}
                    data-test-id={toolbarFlyoutItemTestId(sub, mobile)}
                    data-active={sub === selectedTool || undefined}
                    className={flyoutItemClass}
                    onSelect={() => onSelect(sub)}
                  >
                    <span
                      data-slot="flyout-item-indicator"
                      className={styles.flyoutItemIndicator({ className: ui?.flyoutItemIndicator })}
                      aria-hidden="true"
                    >
                      <DropdownMenu.ItemIndicator>
                        <Check className="size-3.5" />
                      </DropdownMenu.ItemIndicator>
                    </span>
                    <SubIcon
                      className={styles.flyoutItemIcon({ className: ui?.flyoutItemIcon })}
                    />
                    <span className={styles.flyoutItemLabel({ className: ui?.flyoutItemLabel })}>
                      {toolLabels[sub]}
                    </span>
                    {!mobile && toolShortcuts[sub] && (
                      <span className="ml-auto text-xs opacity-50">
                        {toolShortcuts[sub]}
                      </span>
                    )}
                  </DropdownMenu.RadioItem>
                )
              })}
            </DropdownMenu.RadioGroup>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </div>
  )
}
