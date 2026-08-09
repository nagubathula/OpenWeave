import type { Color } from '@openweave/scene-graph/primitives'

export interface ColorUsageEntry {
  hex: string
  color: Color
  count: number
  variableName: string | null
}
