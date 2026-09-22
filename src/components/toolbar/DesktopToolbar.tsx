import { useStore } from '@nanostores/react'
import { Check, Code, Film, MousePointer2, Spline } from 'lucide-react'
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
  inVectorEdit?: boolean
  onExitVectorEdit?: () => void
  inCropMode?: boolean
  onExitCropMode?: (commit?: boolean) => void
  onResetCrop?: () => void
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
  inVectorEdit,
  onExitVectorEdit,
  inCropMode,
  onExitCropMode,
  onResetCrop,
  onSetTool
}: DesktopToolbarProps) {
  const { activeTab: activeTabAtom } = useAIChat()
  const activeTab = useStore(activeTabAtom)

  const isDrawActive =
    activeTool === 'PEN' || activeTool === 'CURVATURE_PEN' || activeTool === 'BEND'
  const isDesignActive = activeTab === 'design' && !isDrawActive
  const isMotionActive = activeTab === 'motion'
  const isCodeActive = activeTab === 'code'

  if (inVectorEdit) {
    return (
      <div className="absolute bottom-3 left-1/2 z-20 flex -translate-x-1/2 items-center transition-all duration-300">
        <div
          data-test-id="toolbar"
          className="flex items-center gap-1 rounded-full bg-panel px-2 py-1.5 shadow-[0_8px_30px_rgb(0_0_0/0.45)] border border-primary/20"
        >
          <div className="flex items-center gap-0.5">
            <Tip label={`${toolLabels.SELECT} (V)`}>
              <ToolButton
                data-test-id="vector-tool-select"
                icon={toolIcons.SELECT}
                label={toolLabels.SELECT}
                active={activeTool === 'SELECT'}
                ui={ui}
                onClick={() => onSetTool('SELECT')}
              />
            </Tip>
            <Tip label={`${toolLabels.PEN} (P)`}>
              <ToolButton
                data-test-id="vector-tool-pen"
                icon={toolIcons.PEN}
                label={toolLabels.PEN}
                active={activeTool === 'PEN'}
                ui={ui}
                onClick={() => onSetTool('PEN')}
              />
            </Tip>
            <Tip label={`${toolLabels.BEND} (B)`}>
              <ToolButton
                data-test-id="vector-tool-bend"
                icon={toolIcons.BEND}
                label={toolLabels.BEND}
                active={activeTool === 'BEND'}
                ui={ui}
                onClick={() => onSetTool('BEND')}
              />
            </Tip>
          </div>

          <div className="mx-1 h-5 w-px bg-border/60" />

          {/* oxlint-disable-next-line openweave/no-hardcoded-tip-labels */}
          <Tip label="Exit Vector Edit (Esc / Enter)">
            <button
              type="button"
              data-test-id="vector-done-btn"
              className="flex items-center gap-1.5 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground shadow-sm hover:opacity-90 active:scale-95 transition-all"
              onClick={onExitVectorEdit}
            >
              <Check className="size-3.5" />
              <span>Done</span>
            </button>
          </Tip>
        </div>
      </div>
    )
  }

  if (inCropMode) {
    return (
      <div className="absolute bottom-3 left-1/2 z-20 flex -translate-x-1/2 items-center transition-all duration-300">
        <div
          data-test-id="crop-toolbar"
          className="flex items-center gap-2 rounded-full bg-panel px-3 py-1.5 shadow-[0_8px_30px_rgb(0_0_0/0.45)] border border-primary/20 text-xs"
        >
          <span className="text-muted font-medium">Crop Image</span>
          <div className="h-4 w-px bg-border/60" />
          {/* oxlint-disable-next-line openweave/no-hardcoded-tip-labels */}
          <Tip label="Reset Image Bounds">
            <button
              type="button"
              data-test-id="crop-reset-btn"
              className="rounded-full px-2.5 py-1 text-xs text-muted hover:text-surface hover:bg-input/50 transition-colors"
              onClick={onResetCrop}
            >
              Reset
            </button>
          </Tip>
          {/* oxlint-disable-next-line openweave/no-hardcoded-tip-labels */}
          <Tip label="Exit Crop (Esc / Enter)">
            <button
              type="button"
              data-test-id="crop-done-btn"
              className="flex items-center gap-1.5 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground shadow-sm hover:opacity-90 active:scale-95 transition-all"
              onClick={() => onExitCropMode?.(true)}
            >
              <Check className="size-3.5" />
              <span>Done</span>
            </button>
          </Tip>
        </div>
      </div>
    )
  }

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
