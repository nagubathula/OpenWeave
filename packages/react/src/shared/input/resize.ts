export { constrainToAspectRatio } from '#react/shared/input/resize/rect'
export { tryStartResize } from '#react/shared/input/resize/start'
import { calculateResizeRect } from '#react/shared/input/resize/rect'
import type { DragResize } from '#react/shared/input/types'
import type { HandlePosition } from '#react/shared/input/types'

import type { Editor } from '@openweave/core/editor'
import { computeAllLayouts, computeLayout } from '@openweave/core/layout'
import { cloneVectorNetwork } from '@openweave/scene-graph'
import type { SceneNode } from '@openweave/scene-graph'
import { copyGeometryPaths, scaleGeometryPaths } from '@openweave/scene-graph/copy'
import {
  computeConstrainedResizeChanges,
  scaleVectorNetworkForResize
} from '@openweave/scene-graph/resize'

export function determineResizeSizingChanges(
  node: SceneNode,
  parent: SceneNode | undefined,
  handle: HandlePosition,
  constrain: boolean
): Partial<SceneNode> {
  const isHorizontal = constrain || (handle !== 'n' && handle !== 's')
  const isVertical = constrain || (handle !== 'w' && handle !== 'e')
  const changes: Partial<SceneNode> = {}

  if (isHorizontal) {
    if (node.layoutMode === 'HORIZONTAL') {
      changes.primaryAxisSizing = 'FIXED'
    } else if (node.layoutMode === 'VERTICAL') {
      changes.counterAxisSizing = 'FIXED'
    } else if (node.counterAxisSizing === 'HUG') {
      changes.counterAxisSizing = 'FIXED'
    }

    if (parent?.layoutMode === 'HORIZONTAL') {
      changes.primaryAxisSizing = 'FIXED'
      changes.layoutGrow = 0
    } else if (parent?.layoutMode === 'VERTICAL') {
      changes.counterAxisSizing = 'FIXED'
      changes.layoutAlignSelf = 'AUTO'
    }

    if (node.type === 'TEXT') {
      if (node.textAutoResize === 'WIDTH_AND_HEIGHT') changes.textAutoResize = 'HEIGHT'
      else if (node.textAutoResize === 'TRUNCATE') changes.textAutoResize = 'NONE'
    }
  }

  if (isVertical) {
    if (node.layoutMode === 'VERTICAL') {
      changes.primaryAxisSizing = 'FIXED'
    } else if (node.layoutMode === 'HORIZONTAL') {
      changes.counterAxisSizing = 'FIXED'
    } else if (node.primaryAxisSizing === 'HUG') {
      changes.primaryAxisSizing = 'FIXED'
    }

    if (parent?.layoutMode === 'VERTICAL') {
      changes.primaryAxisSizing = 'FIXED'
      changes.layoutGrow = 0
    } else if (parent?.layoutMode === 'HORIZONTAL') {
      changes.counterAxisSizing = 'FIXED'
      changes.layoutAlignSelf = 'AUTO'
    }

    if (node.type === 'TEXT') {
      if (node.textAutoResize === 'HEIGHT' || node.textAutoResize === 'WIDTH_AND_HEIGHT') {
        changes.textAutoResize = 'NONE'
      }
    }
  }

  return changes
}

function resizeChanges(d: DragResize, cx: number, cy: number, constrain: boolean) {
  const { origRect } = d
  const newRect = calculateResizeRect(d.handle, origRect, cx - d.startX, cy - d.startY, constrain)

  const changes: Partial<SceneNode> = { ...newRect }

  const resizedVectorNetwork = scaleVectorNetworkForResize(
    d.origVectorNetwork,
    origRect.width,
    origRect.height,
    newRect.width,
    newRect.height
  )
  if (resizedVectorNetwork) changes.vectorNetwork = resizedVectorNetwork
  if (origRect.width > 0 && origRect.height > 0) {
    const scaleX = newRect.width / origRect.width
    const scaleY = newRect.height / origRect.height
    if (scaleX !== 1 || scaleY !== 1) {
      if (d.origFillGeometry.length > 0) {
        changes.fillGeometry = scaleGeometryPaths(d.origFillGeometry, scaleX, scaleY)
      }
      if (d.origStrokeGeometry.length > 0) {
        changes.strokeGeometry = scaleGeometryPaths(d.origStrokeGeometry, scaleX, scaleY)
      }
    }
  }
  return { changes, newRect }
}

function applyConstrainedChildren(
  d: DragResize,
  newRect: Pick<SceneNode, 'width' | 'height'>,
  editor: Editor
) {
  if (!d.origChildren || d.origRect.width <= 0 || d.origRect.height <= 0) return
  const changes = computeConstrainedResizeChanges(
    editor.graph,
    d.nodeId,
    d.origRect,
    newRect,
    d.origChildren
  )
  for (const [childId, childChanges] of changes) {
    editor.graph.updateNodePreview(childId, childChanges)
    editor.renderer?.invalidateVectorPath(childId)
  }
}

function recomputeLayoutsForResize(editor: Editor, nodeId: string, parent: SceneNode | undefined) {
  computeAllLayouts(editor.graph, nodeId)
  let p = parent
  while (p) {
    if (p.layoutMode !== 'NONE') {
      computeLayout(editor.graph, p.id)
    }
    p = p.parentId ? editor.graph.getNode(p.parentId) : undefined
  }
}

export function applyResize(
  d: DragResize,
  cx: number,
  cy: number,
  constrain: boolean,
  editor: Editor
) {
  const { changes, newRect } = resizeChanges(d, cx, cy, constrain)
  const node = editor.graph.getNode(d.nodeId)
  const parent = node?.parentId ? editor.graph.getNode(node.parentId) : undefined
  const sizingChanges = node ? determineResizeSizingChanges(node, parent, d.handle, constrain) : {}
  const allChanges = { ...changes, ...sizingChanges }

  editor.graph.updateNodePreview(d.nodeId, allChanges)
  applyConstrainedChildren(d, newRect, editor)
  editor.graph.runPreviewUpdates(() => recomputeLayoutsForResize(editor, d.nodeId, parent))
  applyConstrainedChildren(d, newRect, editor)
  editor.graph.runPreviewUpdates(() => recomputeLayoutsForResize(editor, d.nodeId, parent))
  editor.requestRepaint()
}

export function commitResizePreview(d: DragResize, editor: Editor) {
  const node = editor.graph.getNode(d.nodeId)
  if (!node) return
  const parent = node.parentId ? editor.graph.getNode(node.parentId) : undefined
  const sizingChanges = determineResizeSizingChanges(node, parent, d.handle, false)
  const finalChanges: Partial<SceneNode> = {
    x: node.x,
    y: node.y,
    width: node.width,
    height: node.height,
    ...sizingChanges
  }
  if (node.vectorNetwork) finalChanges.vectorNetwork = cloneVectorNetwork(node.vectorNetwork)
  finalChanges.fillGeometry = copyGeometryPaths(node.fillGeometry)
  finalChanges.strokeGeometry = copyGeometryPaths(node.strokeGeometry)

  const origSizing: Partial<SceneNode> = {
    primaryAxisSizing: d.origPrimaryAxisSizing,
    counterAxisSizing: d.origCounterAxisSizing,
    layoutGrow: d.origLayoutGrow,
    layoutAlignSelf: d.origLayoutAlignSelf,
    textAutoResize: d.origTextAutoResize
  }

  if (d.origChildren) {
    const finalChildren = new Map<string, Partial<SceneNode>>()
    for (const [childId] of d.origChildren) {
      const child = editor.graph.getNode(childId)
      if (!child) continue
      const final: Partial<SceneNode> = {
        x: child.x,
        y: child.y,
        width: child.width,
        height: child.height
      }
      if (child.vectorNetwork) final.vectorNetwork = cloneVectorNetwork(child.vectorNetwork)
      final.fillGeometry = copyGeometryPaths(child.fillGeometry)
      final.strokeGeometry = copyGeometryPaths(child.strokeGeometry)
      finalChildren.set(childId, final)
    }
    editor.graph.updateNodePreview(d.nodeId, { ...d.origRect, ...origSizing })
    for (const [childId, orig] of d.origChildren) {
      editor.graph.updateNodePreview(childId, orig)
    }
    editor.updateNode(d.nodeId, finalChanges)
    for (const [childId, final] of finalChildren) {
      editor.updateNode(childId, final)
    }
    editor.commitGroupResize(d.nodeId, { ...d.origRect, ...origSizing }, d.origChildren)
    editor.requestRepaint()
  } else {
    editor.graph.updateNodePreview(d.nodeId, { ...d.origRect, ...origSizing })
    editor.updateNode(d.nodeId, finalChanges)
    editor.commitResize(d.nodeId, {
      ...d.origRect,
      ...origSizing,
      vectorNetwork: d.origVectorNetwork,
      fillGeometry: d.origFillGeometry,
      strokeGeometry: d.origStrokeGeometry
    })
  }
}
