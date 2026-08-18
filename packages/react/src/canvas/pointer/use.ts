import {
  canvasToLocalPoint,
  getPointerCoords,
  hitTestInEditorScope,
  isInsideEditorContainerBounds
} from '#react/shared/input/geometry'
import type { HitTestFns } from '#react/shared/input/select'

import type { Editor } from '@openweave/core/editor'
import type { SceneNode } from '@openweave/scene-graph'

import { type CanvasRefLike, getCanvas } from '#react/shared/input/canvas-ref'

export function createCanvasPointer(
  canvasRef: CanvasRefLike,
  editor: Editor,
  hitTestSectionTitle: (cx: number, cy: number) => SceneNode | null,
  hitTestComponentLabel: (cx: number, cy: number) => SceneNode | null,
  hitTestFrameTitle: (cx: number, cy: number) => SceneNode | null
) {
  const canvasToLocal = (cx: number, cy: number, scopeId: string) =>
    canvasToLocalPoint(cx, cy, scopeId, editor)
  const hitTestInScope = (cx: number, cy: number, deep: boolean) =>
    hitTestInEditorScope(cx, cy, deep, editor)
  const isInsideContainerBounds = (cx: number, cy: number, containerId: string) =>
    isInsideEditorContainerBounds(cx, cy, containerId, editor, canvasToLocal)

  const hitFns: HitTestFns = {
    hitTestInScope,
    isInsideContainerBounds,
    hitTestSectionTitle,
    hitTestComponentLabel,
    hitTestFrameTitle
  }

  return {
    getCoords: (e: MouseEvent) => getPointerCoords(e, getCanvas(canvasRef), editor),
    canvasToLocal,
    hitTestInScope,
    isInsideContainerBounds,
    hitFns
  }
}
