import React from 'react'
import Tip from '@/components/ui/Tip'
import ToolButton from '@/components/toolbar/ToolButton'
import ToolFlyout from '@/components/toolbar/ToolFlyout'
import {
  getToolbarToolSelection,
  isToolbarToolActive,
  toolbarToolTestId,
  ToolbarItem
} from '@openweave/react'

import type { Tool, EditorToolDef } from '@openweave/core/editor'
import type { ToolbarUI, ToolIconMap, ToolLabels } from '@/components/toolbar/types'

interface DesktopToolbarProps {
  tools: EditorToolDef[]
  activeTool: Tool
  flyoutSelections: ReadonlyMap<Tool, Tool>
  toolIcons: ToolIconMap
  toolLabels: ToolLabels
  toolShortcuts: Record<Tool, string>
  ui?: ToolbarUI
  onSetTool: (tool: Tool) => void
}

export default function DesktopToolbar({
  tools,
  activeTool,
  flyoutSelections,
  toolIcons,
  toolLabels,
  toolShortcuts,
  ui,
  onSetTool
}: DesktopToolbarProps) {
  return (
    <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center">
      <div
        data-test-id="toolbar"
        className="flex items-center gap-0.5 rounded-full bg-panel px-1.5 py-1.5 shadow-[0_8px_30px_rgb(0_0_0/0.45)]"
      >
        {tools.map(tool => {
          if (tool.flyout && tool.flyout.length > 1) {
            const selected = getToolbarToolSelection(tool, activeTool, flyoutSelections)
            const labelStr = `${toolLabels[selected]} (${tool.shortcut})`

            return (
              <Tip key={tool.key} label={labelStr}>
                <ToolFlyout
                  tool={tool}
                  activeTool={activeTool}
                  selectedTool={selected}
                  toolIcons={toolIcons}
                  toolLabels={toolLabels}
                  toolShortcuts={toolShortcuts}
                  ui={ui}
                  onSelect={onSetTool}
                />
              </Tip>
            )
          }

          return (
            <ToolbarItem key={tool.key} tool={tool.key}>
              {({ active, actions }) => (
                <Tip label={`${toolLabels[tool.key]} (${tool.shortcut})`}>
                  <ToolButton
                    data-test-id={toolbarToolTestId(tool.key)}
                    icon={toolIcons[tool.key]}
                    label={toolLabels[tool.key]}
                    active={active || isToolbarToolActive(tool, activeTool)}
                    ui={ui}
                    onClick={() => actions.select()}
                  />
                </Tip>
              )}
            </ToolbarItem>
          )
        })}
      </div>
    </div>
  )
}
