import type { Editor } from '@openweave/core/editor'
import { computeAccurateBounds, regenerateFillGeometry } from '@openweave/core/vector'
import {
  cloneVectorNetwork,
  transformVectorNetwork,
  vectorNetworksEqual
} from '@openweave/scene-graph'
import type {
  SceneNode,
  Vector,
  VectorNetwork,
  VectorSegment,
  VectorVertex
} from '@openweave/scene-graph'
import { getNodeLocalMatrix, getWorldMatrix } from '@openweave/scene-graph/coordinate'
import Matrix from '@openweave/scene-graph/matrix'

import { getLiveNetwork } from './network'
import type { VectorEditState } from './types'

// Always read editor.graph at call time: opening a file swaps the graph
// instance (editor.replaceGraph), so a captured reference goes stale.
//
// Edit-state geometry lives in page-absolute space, mapped through the node's
// full world matrix so nested, rotated, and flipped nodes edit correctly.
export function createVectorEditLifecycle(editor: Editor, state: VectorEditState) {
  function getNodeEditState() {
    return state.nodeEditState
  }

  function applyNodeEditToNode(es: NonNullable<typeof state.nodeEditState>) {
    const node = editor.graph.getNode(es.nodeId)
    if (node?.type !== 'VECTOR') return

    // Session geometry only changes through explicit edits, so an exact
    // comparison detects a no-op session — skip it to keep undo clean.
    if (vectorNetworksEqual(getLiveNetwork(es), es.origAbsNetwork)) return

    const world = getWorldMatrix(node, editor.graph)
    const inverse = Matrix.invert(world)
    if (!inverse) return

    // Map the edited page-absolute network back into the node's local frame
    const localNetwork = transformVectorNetwork(inverse, getLiveNetwork(es))
    const bounds = computeAccurateBounds(localNetwork)
    const relativeNetwork: VectorNetwork = {
      vertices: localNetwork.vertices.map((v) => ({
        ...v,
        x: v.x - bounds.x,
        y: v.y - bounds.y
      })),
      segments: localNetwork.segments,
      regions: localNetwork.regions
    }

    // The node rotates/flips about its center, so with rotation preserved the
    // new x/y follow from where the new geometry's center lands in the parent
    // frame (via the OLD local matrix — the geometry itself has not moved).
    const localMatrix = getNodeLocalMatrix(node)
    const center = Matrix.mapPoint(localMatrix, {
      x: bounds.x + bounds.width / 2,
      y: bounds.y + bounds.height / 2
    })

    editor.updateNodeWithUndo(
      node.id,
      {
        x: center.x - bounds.width / 2,
        y: center.y - bounds.height / 2,
        width: bounds.width,
        height: bounds.height,
        vectorNetwork: relativeNetwork,
        // Fills render from fillGeometry blobs when present — rebuild them from
        // the edited network so fills follow the edit.
        fillGeometry: regenerateFillGeometry(relativeNetwork, node.fillGeometry),
        // Drop stale imported stroke outline blobs; post-edit strokes come from
        // the live vector network path.
        strokeGeometry: []
      },
      'Edit vector'
    )
    editor.requestRender()
  }

  function shapeToVectorNetwork(node: SceneNode): VectorNetwork | null {
    const w = Math.max(1, node.width)
    const h = Math.max(1, node.height)

    if (node.type === 'RECTANGLE' || node.type === 'FRAME') {
      return {
        vertices: [
          { x: 0, y: 0, handleMirroring: 'NONE' },
          { x: w, y: 0, handleMirroring: 'NONE' },
          { x: w, y: h, handleMirroring: 'NONE' },
          { x: 0, y: h, handleMirroring: 'NONE' }
        ],
        segments: [
          { start: 0, end: 1, tangentStart: { x: 0, y: 0 }, tangentEnd: { x: 0, y: 0 } },
          { start: 1, end: 2, tangentStart: { x: 0, y: 0 }, tangentEnd: { x: 0, y: 0 } },
          { start: 2, end: 3, tangentStart: { x: 0, y: 0 }, tangentEnd: { x: 0, y: 0 } },
          { start: 3, end: 0, tangentStart: { x: 0, y: 0 }, tangentEnd: { x: 0, y: 0 } }
        ],
        regions: [{ windingRule: 'NONZERO', loops: [[0, 1, 2, 3]] }]
      }
    }

    if (node.type === 'LINE') {
      return {
        vertices: [
          { x: 0, y: 0, handleMirroring: 'NONE' },
          { x: w, y: 0, handleMirroring: 'NONE' }
        ],
        segments: [{ start: 0, end: 1, tangentStart: { x: 0, y: 0 }, tangentEnd: { x: 0, y: 0 } }],
        regions: []
      }
    }

    if (node.type === 'ELLIPSE') {
      const rx = w / 2
      const ry = h / 2
      const kappa = 0.5522847498
      const kx = rx * kappa
      const ky = ry * kappa
      return {
        vertices: [
          { x: rx, y: 0, handleMirroring: 'ANGLE_AND_LENGTH' },
          { x: w, y: ry, handleMirroring: 'ANGLE_AND_LENGTH' },
          { x: rx, y: h, handleMirroring: 'ANGLE_AND_LENGTH' },
          { x: 0, y: ry, handleMirroring: 'ANGLE_AND_LENGTH' }
        ],
        segments: [
          { start: 0, end: 1, tangentStart: { x: kx, y: 0 }, tangentEnd: { x: 0, y: -ky } },
          { start: 1, end: 2, tangentStart: { x: 0, y: ky }, tangentEnd: { x: kx, y: 0 } },
          { start: 2, end: 3, tangentStart: { x: -kx, y: 0 }, tangentEnd: { x: 0, y: ky } },
          { start: 3, end: 0, tangentStart: { x: 0, y: -ky }, tangentEnd: { x: -kx, y: 0 } }
        ],
        regions: [{ windingRule: 'NONZERO', loops: [[0, 1, 2, 3]] }]
      }
    }

    function buildPolygonNetwork(
      pointCount: number,
      calcPoint: (i: number) => Vector
    ): VectorNetwork {
      const vertices: VectorVertex[] = []
      const segments: VectorSegment[] = []
      const loop: number[] = []

      for (let i = 0; i < pointCount; i++) {
        const pt = calcPoint(i)
        vertices.push({ x: pt.x, y: pt.y, handleMirroring: 'NONE' })
        loop.push(i)
        segments.push({
          start: i,
          end: (i + 1) % pointCount,
          tangentStart: { x: 0, y: 0 },
          tangentEnd: { x: 0, y: 0 }
        })
      }

      return {
        vertices,
        segments,
        regions: [{ windingRule: 'NONZERO', loops: [loop] }]
      }
    }

    if (node.type === 'POLYGON') {
      const count = Math.max(3, node.pointCount ?? 3)
      const rx = w / 2
      const ry = h / 2
      return buildPolygonNetwork(count, (i) => {
        const angle = -Math.PI / 2 + (i * 2 * Math.PI) / count
        return { x: rx + rx * Math.cos(angle), y: ry + ry * Math.sin(angle) }
      })
    }

    if (node.type === 'STAR') {
      const points = Math.max(3, node.pointCount ?? 5)
      const count = points * 2
      const innerRatio = node.starInnerRadius ?? 0.38
      const rx = w / 2
      const ry = h / 2
      return buildPolygonNetwork(count, (i) => {
        const ratio = i % 2 === 1 ? innerRatio : 1
        const angle = -Math.PI / 2 + (i * Math.PI) / points
        return { x: rx + rx * ratio * Math.cos(angle), y: ry + ry * ratio * Math.sin(angle) }
      })
    }

    return null
  }

  function enterNodeEditMode(nodeId: string) {
    const node = editor.graph.getNode(nodeId)
    if (!node) return

    let currentNetwork = node.vectorNetwork
    if (!currentNetwork) {
      const generated = shapeToVectorNetwork(node)
      if (!generated) return
      editor.graph.updateNode(nodeId, {
        type: 'VECTOR',
        vectorNetwork: generated
      })
      currentNetwork = generated
    }

    const world = getWorldMatrix(node, editor.graph)
    const absNetwork = transformVectorNetwork(world, currentNetwork)

    state.nodeEditState = {
      nodeId,
      origNetwork: cloneVectorNetwork(currentNetwork),
      origBounds: { x: node.x, y: node.y, width: node.width, height: node.height },
      origAbsNetwork: cloneVectorNetwork(absNetwork),
      vertices: absNetwork.vertices,
      segments: absNetwork.segments,
      regions: absNetwork.regions,
      history: [],
      future: [],
      selectedVertexIndices: new Set(),
      draggedHandleInfo: null,
      selectedHandles: new Set(),
      hoveredHandleInfo: null
    }

    editor.select([nodeId])
    editor.requestRender()
  }

  function exitNodeEditMode(commit: boolean) {
    const es = getNodeEditState()
    if (!es) return

    const node = editor.graph.getNode(es.nodeId)
    if (node?.type !== 'VECTOR') {
      state.nodeEditState = null
      editor.requestRender()
      return
    }

    if (commit) {
      applyNodeEditToNode(es)
    } else {
      editor.graph.updateNode(es.nodeId, {
        x: es.origBounds.x,
        y: es.origBounds.y,
        width: es.origBounds.width,
        height: es.origBounds.height,
        vectorNetwork: cloneVectorNetwork(es.origNetwork)
      })
      editor.requestRender()
    }

    state.nodeEditState = null
  }

  return { getNodeEditState, applyNodeEditToNode, enterNodeEditMode, exitNodeEditMode }
}
