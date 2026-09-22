import React, { useMemo } from 'react'

import {
  ToolbarRoot,
  useEditorCommands,
  useI18n,
  useSceneComputed,
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
      SHADER: 'Shader',
      PEN: toolTexts.pen,
      CURVATURE_PEN: toolTexts.curvaturePen,
      BEND: 'Bend',
      CROP: 'Crop',
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
      SHADER: '',
      PEN: 'P',
      CURVATURE_PEN: '⇧P',
      BEND: 'B',
      CROP: '',
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

  const inVectorEdit = useSceneComputed(() => Boolean(store.state.nodeEditState))
  const inCropMode = useSceneComputed(() =>
    Boolean(store.state.cropState || store.state.activeTool === 'CROP')
  )

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
              inVectorEdit={inVectorEdit}
              onExitVectorEdit={() => store.exitNodeEditMode(true)}
              inCropMode={inCropMode}
              onExitCropMode={(commit?: boolean) => store.exitCropMode(commit)}
              onResetCrop={() => store.resetCrop()}
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
