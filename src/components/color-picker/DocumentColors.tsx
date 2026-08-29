import React, { useMemo } from 'react'

import { colorToCSS } from '@openweave/core/color'
import { usePanelMessages } from '@openweave/react'
import type { Color } from '@openweave/scene-graph/primitives'

import { getActiveEditorStoreOrNull } from '@/app/editor/active-store'

const MAX_SWATCHES = 32

/**
 * Distinct solid fill/stroke colors used on the current page, in traversal
 * order. Snapshot semantics: computed when the picker opens, not live, so the
 * grid doesn't reshuffle while the user drags in the color area.
 */
function collectPageColors(): Color[] {
  const store = getActiveEditorStoreOrNull()
  if (!store) return []
  const graph = store.graph
  const seen = new Set<string>()
  const colors: Color[] = []
  const add = (color: Color, opacity: number, visible: boolean) => {
    if (!visible || colors.length >= MAX_SWATCHES) return
    const a = color.a * opacity
    const key = `${color.r},${color.g},${color.b},${a}`
    if (seen.has(key)) return
    seen.add(key)
    colors.push({ ...color, a })
  }

  const queue = [...(graph.getNode(store.state.currentPageId)?.childIds ?? [])]
  while (queue.length > 0 && colors.length < MAX_SWATCHES) {
    const node = graph.getNode(queue.shift() as string)
    if (!node) continue
    for (const fill of node.fills) {
      if (fill.type === 'SOLID') add(fill.color, fill.opacity, fill.visible)
    }
    for (const stroke of node.strokes) add(stroke.color, stroke.opacity, stroke.visible)
    queue.push(...node.childIds)
  }
  return colors
}

/** Figma-style "On this page" section: colors already used on the current page. */
export function DocumentColors({ onPick }: { onPick: (color: Color) => void }) {
  const panels = usePanelMessages()
  const colors = useMemo(collectPageColors, [])
  if (colors.length === 0) return null

  return (
    <div className="mt-2 border-t border-border pt-2">
      <div className="mb-1.5 text-[10px] font-medium text-muted">{panels.colorOnThisPage}</div>
      <div className="grid grid-cols-8 gap-1">
        {colors.map((color) => {
          const css = colorToCSS(color)
          return (
            <button
              key={css}
              type="button"
              aria-label={css}
              title={css}
              data-test-id="color-document-swatch"
              className="aspect-square w-full cursor-pointer rounded-sm border border-border"
              style={{ backgroundColor: css }}
              onClick={() => onPick(color)}
            />
          )
        })}
      </div>
    </div>
  )
}

export default DocumentColors
