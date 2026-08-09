import { useState, useMemo } from 'react'

import type { Tool, EditorToolDef } from '@openweave/core/editor'

const CATEGORY_COUNT = 3

export function isToolbarToolActive(tool: EditorToolDef, activeTool: Tool): boolean {
  return tool.key === activeTool || (tool.flyout?.includes(activeTool) ?? false)
}

export function getToolbarToolSelection(
  tool: EditorToolDef,
  activeTool: Tool,
  flyoutSelections?: ReadonlyMap<Tool, Tool>
): Tool {
  if (tool.flyout?.includes(activeTool)) return activeTool
  return flyoutSelections?.get(tool.key) ?? tool.key
}

export function toolbarToolTestId(key: Tool): string {
  return `tool-${key.toLowerCase()}`
}

/**
 * Returns responsive toolbar UI state for mobile category paging.
 *
 * This composable is presentation-oriented and complements {@link useToolbar}
 * when building toolbar shells.
 */
export function useToolbarState() {
  const [mobileCategory, setMobileCategory] = useState(0)
  const [slideDirection, setSlideDirection] = useState(1)

  const hasPrev = useMemo(() => mobileCategory > 0, [mobileCategory])
  const hasNext = useMemo(() => mobileCategory < CATEGORY_COUNT - 1, [mobileCategory])

  function goPrev() {
    if (!hasPrev) return
    setSlideDirection(-1)
    setMobileCategory(m => m - 1)
  }

  function goNext() {
    if (!hasNext) return
    setSlideDirection(1)
    setMobileCategory(m => m + 1)
  }

  return {
    mobileCategory,
    slideDirection,
    hasPrev,
    hasNext,
    isActive: isToolbarToolActive,
    activeKeyForTool: getToolbarToolSelection,
    goPrev,
    goNext
  }
}
