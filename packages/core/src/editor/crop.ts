import type { GradientTransform, SceneNode } from '@openweave/scene-graph'

import { defaultCropTransform } from '#core/canvas/crop-math'

import type { EditorContext } from './types'

export function createCropActions(
  ctx: EditorContext,
  updateNodeWithUndo: (id: string, changes: Partial<SceneNode>, label?: string) => void
) {
  function enterCropMode(nodeId: string, fillIndex?: number): void {
    const node = ctx.graph.getNode(nodeId)
    if (!node || !node.fills) return

    let fIndex = fillIndex
    if (fIndex === undefined) {
      fIndex = node.fills.findIndex((f) => f.type === 'IMAGE')
    }
    if (fIndex === -1 || !node.fills[fIndex] || node.fills[fIndex].type !== 'IMAGE') {
      return
    }

    const fill = node.fills[fIndex]
    const origTransform = fill.imageTransform ? { ...fill.imageTransform } : undefined
    const origScale = fill.scale ?? 1

    if (fill.imageScaleMode !== 'CROP' && fill.imageScaleMode !== 'TILE') {
      const img = fill.imageHash ? ctx.getRenderer()?.imageCache.get(fill.imageHash) : undefined
      const imgW = img ? img.width() : node.width
      const imgH = img ? img.height() : node.height
      const initialTransform = defaultCropTransform(node.width, node.height, imgW, imgH, 'CROP')

      const newFills = [...node.fills]
      newFills[fIndex] = {
        ...fill,
        imageScaleMode: 'CROP',
        imageTransform: initialTransform
      }
      ctx.graph.updateNode(nodeId, { fills: newFills })
    }

    ctx.setSelectedIds(new Set([nodeId]))
    ctx.state.cropState = {
      nodeId,
      fillIndex: fIndex,
      origTransform,
      origScale
    }
    ctx.setActiveTool('CROP')
    ctx.requestRender()
  }

  function exitCropMode(commit: boolean = true): void {
    const cropState = ctx.state.cropState
    if (!cropState) return

    if (!commit) {
      const node = ctx.graph.getNode(cropState.nodeId)
      if (node?.fills?.[cropState.fillIndex]) {
        const newFills = [...node.fills]
        newFills[cropState.fillIndex] = {
          ...newFills[cropState.fillIndex],
          imageTransform: cropState.origTransform,
          scale: cropState.origScale
        }
        ctx.graph.updateNode(cropState.nodeId, { fills: newFills })
      }
    } else {
      const node = ctx.graph.getNode(cropState.nodeId)
      if (node?.fills) {
        updateNodeWithUndo(cropState.nodeId, { fills: [...node.fills] }, 'Crop Image')
      }
    }

    ctx.state.cropState = null
    ctx.setActiveTool('SELECT')
    ctx.requestRender()
  }

  function mutateCropFill(
    updater: (
      current: NonNullable<SceneNode['fills']>[number]
    ) => NonNullable<SceneNode['fills']>[number]
  ): void {
    const cropState = ctx.state.cropState
    if (!cropState) return
    const node = ctx.graph.getNode(cropState.nodeId)
    const current = node?.fills?.[cropState.fillIndex]
    if (!node?.fills || !current) return

    const newFills = [...node.fills]
    newFills[cropState.fillIndex] = updater(current)
    ctx.graph.updateNode(cropState.nodeId, { fills: newFills })
    ctx.requestRender()
  }

  function setCropTransform(transform: GradientTransform): void {
    mutateCropFill((f) => ({ ...f, imageTransform: transform }))
  }

  function setTileScale(scale: number): void {
    mutateCropFill((f) => ({ ...f, scale }))
  }

  function resetCrop(): void {
    const cropState = ctx.state.cropState
    if (!cropState) return
    const node = ctx.graph.getNode(cropState.nodeId)
    if (!node) return

    mutateCropFill((fill) => {
      const img = fill.imageHash ? ctx.getRenderer()?.imageCache.get(fill.imageHash) : undefined
      const imgW = img ? img.width() : node.width
      const imgH = img ? img.height() : node.height
      return {
        ...fill,
        imageTransform: defaultCropTransform(
          node.width,
          node.height,
          imgW,
          imgH,
          fill.imageScaleMode ?? 'CROP'
        )
      }
    })
  }

  return {
    enterCropMode,
    exitCropMode,
    setCropTransform,
    setTileScale,
    resetCrop
  }
}
