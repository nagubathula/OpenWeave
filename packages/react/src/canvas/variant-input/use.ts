import {
  VARIANT_ADD_HIT_RADIUS,
  variantAddButtonPosition,
  variantAddTarget
} from '@openweave/core/canvas'
import type { Editor } from '@openweave/core/editor'

/**
 * Claim a click on the add-variant "+" button drawn under a selected
 * component set or component. Returns true when the click added a variant.
 */
export function handleVariantAddClick(cx: number, cy: number, editor: Editor): boolean {
  const target = variantAddTarget(editor.graph, editor.state.selectedIds)
  if (!target) return false

  const button = variantAddButtonPosition(editor.graph, target, editor.state.zoom)
  const threshold = VARIANT_ADD_HIT_RADIUS / editor.state.zoom
  if (Math.hypot(cx - button.x, cy - button.y) > threshold) return false

  editor.addVariant(target.id)
  editor.requestRepaint()
  return true
}
