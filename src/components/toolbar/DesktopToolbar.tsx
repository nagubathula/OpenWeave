import { useStore } from '@nanostores/react'
import { Code, Film, MousePointer2, Spline } from 'lucide-react'
import React from 'react'

import type { Tool, EditorToolDef } from '@openweave/core/editor'
import {
  getToolbarToolSelection,
  isToolbarToolActive,
  toolbarToolTestId,
  ToolbarItem
} from '@openweave/react'

import { useAIChat } from '@/app/ai/chat/use'
import ToolButton from '@/components/toolbar/ToolButton'
import ToolFlyout from '@/components/toolbar/ToolFlyout'
import type { ToolbarUI, ToolIconMap, ToolLabels } from '@/components/toolbar/types'
import Tip from '@/components/ui/Tip'

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
  const { activeTab: activeTabAtom } = useAIChat()
  const activeTab = useStore(activeTabAtom)

  const isDrawActive = activeTool === 'PEN' || activeTool === 'CURVATURE_PEN'
  const isDesignActive = activeTab === 'design' && !isDrawActive
  const isMotionActive = activeTab === 'motion'
  const isCodeActive = activeTab === 'code'

  return (
    <div className="absolute bottom-3 left-1/2 z-20 flex -translate-x-1/2 items-center transition-all duration-300">
      <div
        data-test-id="toolbar"
        className="flex items-center gap-0.5 rounded-full bg-panel px-1.5 py-1.5 shadow-[0_8px_30px_rgb(0_0_0/0.45)]"
      >
        {tools.map((tool) => {
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

        {/* Divider matching Figma */}
        <div className="mx-1 h-5 w-px bg-border/60" />

        {/* Mode Switcher */}
        {/* oxlint-disable-next-line openweave/no-hardcoded-tip-labels */}
        <Tip label="Draw">
          <ToolButton
            data-test-id="mode-draw-button"
            icon={Spline}
            label="Draw"
            active={isDrawActive}
            ui={ui}
            onClick={() => onSetTool('PEN')}
          />
        </Tip>

        {/* oxlint-disable-next-line openweave/no-hardcoded-tip-labels */}
        <Tip label="Design">
          <ToolButton
            data-test-id="mode-design-button"
            icon={MousePointer2}
            label="Design"
            active={isDesignActive}
            ui={ui}
            onClick={() => {
              activeTabAtom.set('design')
              onSetTool('SELECT')
            }}
          />
        </Tip>

        {/* oxlint-disable-next-line openweave/no-hardcoded-tip-labels */}
        <Tip label="Motion">
          <ToolButton
            data-test-id="mode-motion-button"
            icon={Film}
            label="Motion"
            active={isMotionActive}
            ui={ui}
            onClick={() => activeTabAtom.set('motion')}
          />
        </Tip>

        {/* oxlint-disable-next-line openweave/no-hardcoded-tip-labels */}
        <Tip label="Code">
          <ToolButton
            data-test-id="mode-code-button"
            icon={Code}
            label="Code"
            active={isCodeActive}
            ui={ui}
            onClick={() => activeTabAtom.set('code')}
          />
        </Tip>
      </div>
    </div>
  )
}
