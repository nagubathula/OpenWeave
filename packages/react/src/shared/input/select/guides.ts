import { RULER_SIZE } from '@openweave/core/constants'
import type { Editor } from '@openweave/core/editor'

import type { DragGuide, DragState } from '../types'

export function findHoveredGuide(
  editor: Editor,
  cx: number,
  cy: number,
  zoom: number
): { guide: { axis: 'X' | 'Y'; offset: number }; index: number } | null {
  const guides = editor.getPageGuides()
  if (guides.length === 0) return null
  const tolerance = 5 / zoom
  for (let i = 0; i < guides.length; i++) {
    const g = guides[i]
    if (g.axis === 'X') {
      if (Math.abs(cx - g.offset) <= tolerance) {
        return { guide: g, index: i }
      }
    } else if (g.axis === 'Y') {
      if (Math.abs(cy - g.offset) <= tolerance) {
        return { guide: g, index: i }
      }
    }
  }
  return null
}

export function tryStartGuideDrag(
  editor: Editor,
  sx: number,
  sy: number,
  cx: number,
  cy: number,
  setDrag: (d: DragState) => void,
  setCursorOverride: (c: string | null) => void
): boolean {
  if ((editor.state as { showRulers?: boolean }).showRulers === false) return false
  if (editor.canvasRenderers.length > 0 && !editor.canvasRenderers.some((r) => r.showRulers)) {
    return false
  }

  // Click on top ruler creates a horizontal guide (running across X, positioned along Y)
  if (sy <= RULER_SIZE && sx >= RULER_SIZE) {
    const offset = Math.round(cy)
    setDrag({
      type: 'guide-drag',
      axis: 'Y',
      currentOffset: offset,
      isNew: true
    })
    editor.setActiveGuide({ axis: 'Y', offset })
    setCursorOverride('row-resize')
    return true
  }

  // Click on left ruler creates a vertical guide (running across Y, positioned along X)
  if (sx <= RULER_SIZE && sy >= RULER_SIZE) {
    const offset = Math.round(cx)
    setDrag({
      type: 'guide-drag',
      axis: 'X',
      currentOffset: offset,
      isNew: true
    })
    editor.setActiveGuide({ axis: 'X', offset })
    setCursorOverride('col-resize')
    return true
  }

  // Check if clicked on an existing guide line
  const hovered = findHoveredGuide(editor, cx, cy, editor.state.zoom)
  if (hovered) {
    setDrag({
      type: 'guide-drag',
      axis: hovered.guide.axis,
      currentOffset: hovered.guide.offset,
      isNew: false,
      guideIndex: hovered.index,
      origOffset: hovered.guide.offset
    })
    editor.setActiveGuide({ axis: hovered.guide.axis, offset: hovered.guide.offset })
    setCursorOverride(hovered.guide.axis === 'X' ? 'col-resize' : 'row-resize')
    return true
  }

  return false
}

export function handleGuideDragMove(
  d: DragGuide,
  editor: Editor,
  cx: number,
  cy: number,
  shiftKey: boolean
): void {
  let nextOffset = Math.round(d.axis === 'X' ? cx : cy)
  if (shiftKey) {
    nextOffset = Math.round(nextOffset / 8) * 8
  }
  d.currentOffset = nextOffset
  editor.setActiveGuide({ axis: d.axis, offset: nextOffset })
}

export function handleGuideDragUp(d: DragGuide, editor: Editor, sx: number, sy: number): void {
  editor.setActiveGuide(null)
  const isDroppedOnRuler =
    (d.axis === 'Y' && sy <= RULER_SIZE) || (d.axis === 'X' && sx <= RULER_SIZE)

  if (d.isNew) {
    if (!isDroppedOnRuler) {
      editor.addPageGuide({ axis: d.axis, offset: d.currentOffset })
    }
  } else if (d.guideIndex != null) {
    if (isDroppedOnRuler) {
      editor.removePageGuide(d.guideIndex)
    } else if (d.currentOffset !== d.origOffset) {
      editor.updatePageGuide(d.guideIndex, d.currentOffset)
    }
  }
}
