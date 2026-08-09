import React from 'react'
import {
  Circle as IconCircle,
  Columns3 as IconColumns,
  Component as IconComponentSet,
  Diamond as IconComponent,
  Frame as IconFrame,
  Grid3X3 as IconGrid,
  Group as IconGroup,
  Hand as IconHand,
  LayoutGrid as IconSection,
  Minus as IconMinus,
  MousePointer2 as IconMousePointer,
  PenTool as IconPenTool,
  Rows3 as IconRows,
  Square as IconSquare,
  Star as IconStar,
  Triangle as IconTriangle,
  Type as IconType,
  LucideIcon
} from 'lucide-react'

import type { Tool } from '@/app/editor/session'

export const toolIcons: Record<Tool, LucideIcon> = {
  SELECT: IconMousePointer,
  FRAME: IconFrame,
  SECTION: IconSection,
  RECTANGLE: IconSquare,
  ELLIPSE: IconCircle,
  LINE: IconMinus,
  POLYGON: IconTriangle,
  STAR: IconStar,
  PEN: IconPenTool,
  TEXT: IconType,
  HAND: IconHand
}

export const NODE_ICONS: Partial<Record<string, LucideIcon>> = {
  SECTION: IconSection,
  ELLIPSE: IconCircle,
  FRAME: IconFrame,
  GROUP: IconGroup,
  COMPONENT: IconComponent,
  COMPONENT_SET: IconComponentSet,
  INSTANCE: IconComponent,
  LINE: IconMinus,
  TEXT: IconType,
  VECTOR: IconPenTool,
  RECTANGLE: IconSquare
}

export const AUTO_LAYOUT_ICONS: Partial<Record<string, LucideIcon>> = {
  VERTICAL: IconRows,
  HORIZONTAL: IconColumns,
  GRID: IconGrid
}

export const COMPONENT_TYPES = new Set(['COMPONENT', 'COMPONENT_SET', 'INSTANCE'])

export { IconFrame, IconSquare }

export function nodeIcon(node: { type: string; layoutMode: string }) {
  if (node.type === 'FRAME' && node.layoutMode !== 'NONE')
    return AUTO_LAYOUT_ICONS[node.layoutMode] ?? IconFrame
  return NODE_ICONS[node.type] ?? IconSquare
}
