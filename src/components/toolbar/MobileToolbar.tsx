import React from 'react'
import { tv } from 'tailwind-variants'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronLeft, ChevronRight } from 'lucide-react'

import ToolButton from '@/components/toolbar/ToolButton'
import ToolFlyout from '@/components/toolbar/ToolFlyout'
import ToolbarActionGroup from '@/components/toolbar/ToolbarActionGroup'
import toolbarTheme from '@/theme/toolbar'
import { getToolbarToolSelection, toolbarToolTestId, ToolbarItem } from '@openweave/react'

import type { Tool, EditorToolDef } from '@openweave/core/editor'
import type {
  ToolbarActionItem,
  ToolbarUI,
  ToolIconMap,
  ToolLabels
} from '@/components/toolbar/types'

interface MobileToolbarProps {
  tools: EditorToolDef[]
  activeTool: Tool
  flyoutSelections: ReadonlyMap<Tool, Tool>
  toolIcons: ToolIconMap
  toolLabels: ToolLabels
  toolShortcuts: Record<Tool, string>
  ui?: ToolbarUI
  mobileCategory: number
  slideDirection: number
  hasPrev: boolean
  hasNext: boolean
  editActions: ToolbarActionItem[]
  arrangeActions: ToolbarActionItem[]
  onSetTool: (tool: Tool) => void
  onPrev: () => void
  onNext: () => void
  onAction: (item: ToolbarActionItem) => void
}

const toolbar = tv(toolbarTheme)
const styles = toolbar()

const slideVariants = {
  initial: (dir: number) => ({ opacity: 0, x: dir * 20 }),
  animate: { opacity: 1, x: 0 },
  exit: (dir: number) => ({ opacity: 0, x: dir * -20 })
}

export default function MobileToolbar({
  tools,
  activeTool,
  flyoutSelections,
  toolIcons,
  toolLabels,
  toolShortcuts,
  ui,
  mobileCategory,
  slideDirection,
  hasPrev,
  hasNext,
  editActions,
  arrangeActions,
  onSetTool,
  onPrev,
  onNext,
  onAction
}: MobileToolbarProps) {
  function navigationClass(disabled: boolean) {
    return toolbar({ disabled }).navigationAction({ className: ui?.navigationAction })
  }

  return (
    <div
      data-test-id="mobile-toolbar"
      className="fixed left-1/2 z-20 flex -translate-x-1/2 items-center gap-1.5"
      style={{
        maxWidth: 'calc(100vw - 2rem)',
        bottom: `calc(56px + env(safe-area-inset-bottom) + 0.75rem)`
      }}
    >
      <motion.button
        data-test-id="mobile-toolbar-prev"
        disabled={!hasPrev}
        data-disabled={!hasPrev || undefined}
        className={navigationClass(!hasPrev)}
        animate={{ opacity: hasPrev ? 1 : 0 }}
        transition={{ duration: 0.15 }}
        onClick={onPrev}
      >
        <ChevronLeft className={styles.navigationIcon({ className: ui?.navigationIcon })} />
      </motion.button>

      <motion.div
        layout
        data-test-id="mobile-toolbar-container"
        className="relative flex h-11 items-center overflow-hidden rounded-full border border-border bg-panel px-2 shadow-lg"
        transition={{ layout: { type: 'spring', damping: 30, stiffness: 500 } }}
      >
        <AnimatePresence mode="popLayout" custom={slideDirection}>
          {mobileCategory === 0 && (
            <motion.div
              key="tools"
              data-test-id="mobile-toolbar-tools"
              className="flex gap-0.5"
              variants={slideVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.15 }}
              custom={slideDirection}
            >
              {tools.map(tool => {
                if (tool.flyout && tool.flyout.length > 1) {
                  return (
                    <ToolFlyout
                      key={tool.key}
                      mobile
                      tool={tool}
                      activeTool={activeTool}
                      selectedTool={getToolbarToolSelection(tool, activeTool, flyoutSelections)}
                      toolIcons={toolIcons}
                      toolLabels={toolLabels}
                      toolShortcuts={toolShortcuts}
                      ui={ui}
                      onSelect={onSetTool}
                    />
                  )
                }

                return (
                  <ToolbarItem key={tool.key} tool={tool.key}>
                    {({ active, actions }) => (
                      <ToolButton
                        mobile
                        data-test-id={toolbarToolTestId(tool.key, true)}
                        icon={toolIcons[tool.key]}
                        active={
                          active ||
                          getToolbarToolSelection(tool, activeTool, flyoutSelections) === activeTool
                        }
                        ui={ui}
                        onClick={() => actions.select()}
                      />
                    )}
                  </ToolbarItem>
                )
              })}
            </motion.div>
          )}

          {mobileCategory === 1 && (
            <motion.div
              key="edit"
              data-test-id="mobile-toolbar-edit"
              className="flex gap-0.5"
              variants={slideVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.15 }}
              custom={slideDirection}
            >
              <ToolbarActionGroup
                actions={editActions}
                ui={ui}
                testPrefix="mobile-toolbar"
                onAction={onAction}
              />
            </motion.div>
          )}

          {mobileCategory > 1 && (
            <motion.div
              key="arrange"
              data-test-id="mobile-toolbar-arrange"
              className="flex gap-0.5"
              variants={slideVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.15 }}
              custom={slideDirection}
            >
              <ToolbarActionGroup
                actions={arrangeActions}
                ui={ui}
                testPrefix="mobile-toolbar"
                onAction={onAction}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <motion.button
        data-test-id="mobile-toolbar-next"
        disabled={!hasNext}
        data-disabled={!hasNext || undefined}
        className={navigationClass(!hasNext)}
        animate={{ opacity: hasNext ? 1 : 0 }}
        transition={{ duration: 0.15 }}
        onClick={onNext}
      >
        <ChevronRight className={styles.navigationIcon({ className: ui?.navigationIcon })} />
      </motion.button>
    </div>
  )
}
