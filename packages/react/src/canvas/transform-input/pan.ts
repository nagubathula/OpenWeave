import type { DragPan } from '#react/shared/input/types'

import type { Editor } from '@openweave/core/editor'

export function handlePanMove(editor: Editor, d: DragPan, event: MouseEvent) {
  const dx = event.clientX - d.startScreenX
  const dy = event.clientY - d.startScreenY
  editor.state.panX = d.startPanX + dx
  editor.state.panY = d.startPanY + dy
  editor.requestRepaint()
}
