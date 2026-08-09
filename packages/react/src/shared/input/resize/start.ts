import type { Editor } from '@openweave/core/editor'
import { cloneVectorNetwork } from '@openweave/scene-graph'
import { copyGeometryPaths } from '@openweave/scene-graph/copy'
import { collectResizeDescendants } from '@openweave/scene-graph/resize'

import { getHitHandleByMatrix } from '#react/shared/input/geometry'
import type { DragResize } from '#react/shared/input/types'

export function tryStartResize(cx: number, cy: number, editor: Editor): DragResize | null {
  for (const id of editor.state.selectedIds) {
    const node = editor.graph.getNode(id)
    if (!node || node.locked) continue
    const handleResult = getHitHandleByMatrix(cx, cy, node, editor.graph, editor.renderer?.zoom)
    if (handleResult) {
      return {
        type: 'resize',
        handle: handleResult.handle,
        startX: cx,
        startY: cy,
        origRect: { x: node.x, y: node.y, width: node.width, height: node.height },
        nodeId: id,
        origVectorNetwork: node.vectorNetwork ? cloneVectorNetwork(node.vectorNetwork) : null,
        origFillGeometry: copyGeometryPaths(node.fillGeometry),
        origStrokeGeometry: copyGeometryPaths(node.strokeGeometry),
        origChildren: collectResizeDescendants(editor.graph, id)
      }
    }
  }
  return null
}
