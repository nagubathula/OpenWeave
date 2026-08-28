import React, { useMemo } from 'react'

import {
  ToolbarRoot,
  useEditorCommands,
  useI18n,
  useToolbarState,
  useViewportKind
} from '@openweave/react'
import type { Tool } from '@openweave/react'

import { useEditorStore } from '@/app/editor/active-store'
import { toolIcons } from '@/app/editor/icons'
import { useActionToast } from '@/app/shell/toast/action'
import { useToolbarActions } from '@/components/toolbar/actions'
import DesktopToolbar from '@/components/toolbar/DesktopToolbar'
import MobileToolbar from '@/components/toolbar/MobileToolbar'
import type { ToolbarActionItem } from '@/components/toolbar/types'
import { useMenuUI } from '@/components/ui/menu'

export default function Toolbar() {
  const store = useEditorStore()
  const { isMobile } = useViewportKind()
  const { getCommand } = useEditorCommands()
  const { showActionToast } = useActionToast()
  const { menu, tools: toolTexts } = useI18n()

  const toolLabels = useMemo<Record<Tool, string>>(
    () => ({
      SELECT: toolTexts.move,
      FRAME: toolTexts.frame,
      SECTION: toolTexts.section,
      RECTANGLE: toolTexts.rectangle,
      ELLIPSE: toolTexts.ellipse,
      LINE: toolTexts.line,
      POLYGON: toolTexts.polygon,
      STAR: toolTexts.star,
      PEN: toolTexts.pen,
      CURVATURE_PEN: toolTexts.curvaturePen,
      TEXT: toolTexts.text,
      HAND: toolTexts.hand
    }),
    [toolTexts]
  )

  const toolShortcuts = useMemo<Record<Tool, string>>(
    () => ({
      SELECT: 'V',
      FRAME: 'F',
      SECTION: 'S',
      RECTANGLE: 'R',
      ELLIPSE: 'O',
      LINE: 'L',
      POLYGON: '',
      STAR: '',
      PEN: 'P',
      CURVATURE_PEN: '⇧P',
      TEXT: 'T',
      HAND: 'H'
    }),
    []
  )

  const flyoutMenuCls = useMenuUI({ content: 'min-w-32' })
  const toolbarUi = useMemo(
    () => ({ flyoutContent: flyoutMenuCls.content }),
    [flyoutMenuCls.content]
  )
  const { editActions, arrangeActions } = useToolbarActions({ store, getCommand, menu })

  const { mobileCategory, slideDirection, hasPrev, hasNext, goPrev, goNext } = useToolbarState()

  function onActionTap(item: ToolbarActionItem) {
    item.action()
    showActionToast(item.label)
  }

  return (
    <ToolbarRoot>
      {({ tools, activeTool, flyoutSelections, actions }) => {
        if (!isMobile) {
          return (
            <DesktopToolbar
              tools={tools}
              activeTool={activeTool}
              flyoutSelections={flyoutSelections}
              toolIcons={toolIcons}
              toolLabels={toolLabels}
              toolShortcuts={toolShortcuts}
              ui={toolbarUi}
              onSetTool={actions.setTool}
            />
          )
        }

        return (
          <MobileToolbar
            tools={tools}
            activeTool={activeTool}
            flyoutSelections={flyoutSelections}
            toolIcons={toolIcons}
            toolLabels={toolLabels}
            toolShortcuts={toolShortcuts}
            ui={toolbarUi}
            mobileCategory={mobileCategory}
            slideDirection={slideDirection}
            hasPrev={hasPrev}
            hasNext={hasNext}
            editActions={editActions}
            arrangeActions={arrangeActions}
            onSetTool={actions.setTool}
            onPrev={goPrev}
            onNext={goNext}
            onAction={onActionTap}
          />
        )
      }}
    </ToolbarRoot>
  )
}
