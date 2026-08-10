import type React from 'react'

export type PropertyGridColumns = 1 | 2 | 3
export type PropertyGridDistribution = 'equal' | 'wide-first'

export interface PropertyGridRootProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Number of field columns. @default 1 */
  columns?: PropertyGridColumns
  /** Relative distribution of field columns. @default 'equal' */
  distribution?: PropertyGridDistribution
  /** Optional intrinsic-width controls kept separate from the field grid. */
  actions?: React.ReactNode
}
