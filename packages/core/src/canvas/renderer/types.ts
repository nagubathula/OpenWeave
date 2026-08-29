import type { VectorRegion, VectorVertex } from '@openweave/scene-graph'
import type { Color, Rect, Vector } from '@openweave/scene-graph/primitives'
import type { SnapGuide } from '@openweave/scene-graph/snap'

import type { TextEditor } from '#core/text/editor'

export interface RulerTheme {
  background: Color
  tick: Color
  text: Color
  label: Color
}

export interface RenderOverlays {
  hoveredNodeId?: string | null
  enteredContainerId?: string | null
  editingTextId?: string | null
  textEditor?: TextEditor | null
  marquee?: Rect | null
  snapGuides?: SnapGuide[]
  rotationPreview?: { nodeId: string; angle: number } | null
  dropTargetId?: string | null
  layoutInsertIndicator?: {
    x: number
    y: number
    length: number
    direction: 'HORIZONTAL' | 'VERTICAL'
  } | null
  autoLayoutHover?: {
    nodeId: string
    kind: 'frame' | 'children' | 'spacing' | 'spacing-value' | 'padding' | 'padding-value'
    index?: number
    side?: 'top' | 'right' | 'bottom' | 'left'
  } | null
  penState?: {
    vertices: Vector[]
    segments: Array<{
      start: number
      end: number
      tangentStart: Vector
      tangentEnd: Vector
    }>
    dragTangent: Vector | null
    oppositeDragTangent?: Vector | null
    closingToFirst: boolean
    pendingClose?: boolean
    cursorX?: number
    cursorY?: number
  } | null
  nodeEditState?: {
    nodeId: string
    vertices: VectorVertex[]
    segments: Array<{
      start: number
      end: number
      tangentStart: Vector
      tangentEnd: Vector
    }>
    regions: VectorRegion[]
    selectedVertexIndices: Set<number>
    /** Set of selected handles as "segIdx:tangentField" strings */
    selectedHandles?: Set<string>
    hoveredHandleInfo?: { segmentIndex: number; tangentField: 'tangentStart' | 'tangentEnd' } | null
  } | null
  remoteCursors?: Array<{
    name: string
    color: Color
    x: number
    y: number
    selection?: string[]
  }>
  /** Draw prototype connection arrows (Prototype tab active). */
  prototypeMode?: boolean
  /** Live prototype-connection drag from a node's connector handle. */
  prototypeDrag?: { sourceId: string; cursorX: number; cursorY: number } | null
}
