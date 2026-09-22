import type { Tool } from '@openweave/core/editor'
import type {
  GeometryPath,
  LayoutAlignSelf,
  LayoutSizing,
  NodeType,
  TextAutoResize,
  VectorNetwork
} from '@openweave/scene-graph'
import type { Rect, Vector } from '@openweave/scene-graph/primitives'
import type { ResizeSnapshot } from '@openweave/scene-graph/resize'

export type HandlePosition = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w'

export type CornerPosition = 'nw' | 'ne' | 'se' | 'sw'

export interface DragDraw {
  type: 'draw'
  startX: number
  startY: number
  nodeId: string
}

export interface DragMove {
  type: 'move'
  startX: number
  startY: number
  currentX: number
  currentY: number
  startScreenX: number
  startScreenY: number
  dragStarted: boolean
  originals: Map<string, { x: number; y: number; parentId: string }>
  duplicated?: boolean
  duplicatedPreviousSelection?: Set<string>
  autoLayoutParentId?: string
  brokeFromAutoLayout?: boolean
}

export interface DragPan {
  type: 'pan'
  startScreenX: number
  startScreenY: number
  startPanX: number
  startPanY: number
}

export interface DragResize {
  type: 'resize'
  handle: HandlePosition
  startX: number
  startY: number
  origRect: Rect
  nodeId: string
  origVectorNetwork: VectorNetwork | null
  origFillGeometry: GeometryPath[]
  origStrokeGeometry: GeometryPath[]
  origChildren: Map<string, ResizeSnapshot> | null
  origPrimaryAxisSizing?: LayoutSizing
  origCounterAxisSizing?: LayoutSizing
  origLayoutGrow?: number
  origLayoutAlignSelf?: LayoutAlignSelf
  origTextAutoResize?: TextAutoResize
}

export interface DragMarquee {
  type: 'marquee'
  startX: number
  startY: number
}

export interface DragRotate {
  type: 'rotate'
  nodeId: string
  centerX: number
  centerY: number
  startAngle: number
  origRotation: number
}

export interface DragPen {
  type: 'pen-drag'
  startX: number
  startY: number
  modifierMode: 'default' | 'continuous' | 'independent'
  frozenOppositeTangent: Vector | null
  spaceDown: boolean
  spaceStartX: number
  spaceStartY: number
  knotStartX: number
  knotStartY: number
}

export interface DragProtoConnect {
  type: 'proto-connect'
  sourceId: string
}

export interface DragTextSelect {
  type: 'text-select'
  startX: number
  startY: number
}

export interface DragEditNode {
  type: 'edit-node'
  startX: number
  startY: number
  origPositions: Map<number, Vector>
}

export interface DragEditHandle {
  type: 'edit-handle'
  segmentIndex: number
  tangentField: 'tangentStart' | 'tangentEnd'
  vertexIndex: number
  startX: number
  startY: number
  initialTangent: Vector | null
}

export interface DragBendHandle {
  type: 'bend-handle'
  vertexIndex: number
  startX: number
  startY: number
  lockedMode: 'symmetric' | 'independent' | null
  dragSamples: Vector[]
  targetSegmentIndex: number | null
  targetTangentField: 'tangentStart' | 'tangentEnd' | null
}

export interface DragAutoLayoutPadding {
  type: 'auto-layout-padding'
  nodeId: string
  side: 'top' | 'right' | 'bottom' | 'left'
  startX: number
  startY: number
  initialValues: {
    top: number
    right: number
    bottom: number
    left: number
  }
}

export interface DragAutoLayoutGap {
  type: 'auto-layout-gap'
  nodeId: string
  startX: number
  startY: number
  initialSpacing: number
  layoutMode: 'HORIZONTAL' | 'VERTICAL'
}

export interface DragCornerRadius {
  type: 'corner-radius'
  nodeId: string
  corner: 'tl' | 'tr' | 'br' | 'bl'
  startX: number
  startY: number
  initialValues: {
    cornerRadius: number
    topLeftRadius: number
    topRightRadius: number
    bottomRightRadius: number
    bottomLeftRadius: number
    independentCorners: boolean
  }
}

export interface DragGuide {
  type: 'guide-drag'
  axis: 'X' | 'Y'
  currentOffset: number
  isNew: boolean
  guideIndex?: number
  origOffset?: number
}

export type DragState =
  | DragDraw
  | DragMove
  | DragPan
  | DragResize
  | DragMarquee
  | DragRotate
  | DragPen
  | DragProtoConnect
  | DragTextSelect
  | DragEditNode
  | DragEditHandle
  | DragBendHandle
  | DragAutoLayoutPadding
  | DragAutoLayoutGap
  | DragCornerRadius
  | DragGuide

export const TOOL_TO_NODE: Partial<Record<Tool, NodeType>> = {
  FRAME: 'FRAME',
  SECTION: 'SECTION',
  RECTANGLE: 'RECTANGLE',
  ELLIPSE: 'ELLIPSE',
  LINE: 'LINE',
  POLYGON: 'POLYGON',
  STAR: 'STAR',
  SHADER: 'SHADER',
  TEXT: 'TEXT'
}
