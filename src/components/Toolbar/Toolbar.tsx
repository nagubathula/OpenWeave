import React, { useEffect, useMemo, useState } from 'react'
import { watch } from 'vue'

import DesktopToolbar from '@/components/Toolbar/DesktopToolbar'
import MobileToolbar from '@/components/Toolbar/MobileToolbar'
import { useToolbarActions } from '@/components/Toolbar/actions'
import { useActionToast } from '@/app/shell/toast/action'
import { useEditorStore } from '@/app/editor/active-store'
import { toolIcons } from '@/app/editor/icons'
import { useMenuUI } from '@/components/ui/menu'
import {
  ToolbarRoot,
  useEditorCommands,
  useI18n,
  useToolbarState,
  useViewportKind
} from '@openweave/react'

import type { Tool } from '@openweave/react'
import type { ToolbarActionItem } from '@/components/Toolbar/types'

export default function Toolbar() {
  const store = useEditorStore()
  // `useViewportKind().isMobile` is a Vue ref, so it's always truthy when read
  // directly — a bare `!isMobile` would always be false and force the mobile
  // toolbar on desktop. Bridge the ref to React state (also keeps it reactive to
  // window resizes across the 768px breakpoint).
  const { isMobile: isMobileRef } = useViewportKind()
  const [isMobile, setIsMobile] = useState(isMobileRef.value)
  useEffect(() => {
    const stop = watch(isMobileRef, (value) => setIsMobile(value), { immediate: true })
    return stop
  }, [isMobileRef])
  const { getCommand } = useEditorCommands()
  const { showActionToast } = useActionToast()
  const { menu, tools: toolTexts } = useI18n()

  const toolLabels = useMemo<Record<Tool, string>>(() => ({
    SELECT: toolTexts.move,
    FRAME: toolTexts.frame,
    SECTION: toolTexts.section,
    RECTANGLE: toolTexts.rectangle,
    ELLIPSE: toolTexts.ellipse,
    LINE: toolTexts.line,
    POLYGON: toolTexts.polygon,
    STAR: toolTexts.star,
    PEN: toolTexts.pen,
    TEXT: toolTexts.text,
    HAND: toolTexts.hand
  }), [toolTexts])

  const toolShortcuts = useMemo<Record<Tool, string>>(() => ({
    SELECT: 'V',
    FRAME: 'F',
    SECTION: 'S',
    RECTANGLE: 'R',
    ELLIPSE: 'O',
    LINE: 'L',
    POLYGON: '',
    STAR: '',
    PEN: 'P',
    TEXT: 'T',
    HAND: 'H'
  }), [])

  const flyoutMenuCls = useMenuUI({ content: 'min-w-32' })
  const toolbarUi = useMemo(() => ({ flyoutContent: flyoutMenuCls.content }), [flyoutMenuCls.content])
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
