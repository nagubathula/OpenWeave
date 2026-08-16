import type { MaskType } from '@openweave/scene-graph'

import { useEditor } from '#react/editor/context'
import { useSelectionState } from '#react/editor/selection-state/use'

/** Headless state and actions for the selected mask node. */
export function useMask() {
  const editor = useEditor()
  const { selectedNode } = useSelectionState()

  const active = selectedNode?.isMask === true
  const maskType: MaskType = selectedNode?.maskType ?? 'ALPHA'

  function setMaskType(value: MaskType) {
    const node = selectedNode
    if (!node?.isMask || node.maskType === value) return
    editor.updateNodeWithUndo(node.id, { maskType: value }, 'Change mask type')
  }

  return { active, maskType, setMaskType }
}
