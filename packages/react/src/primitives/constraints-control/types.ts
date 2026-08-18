import type {
  ConstraintAxis,
  ConstraintEdge,
  ConstraintValue
} from '#react/controls/constraints/model'

import type { ConstraintType } from '@openweave/scene-graph'

export interface ConstraintsControlActions {
  setHorizontal(value: ConstraintType): void
  setVertical(value: ConstraintType): void
  setCenter(axis: ConstraintAxis): void
  togglePin(axis: ConstraintAxis, edge: ConstraintEdge, additive: boolean): void
}

export interface ConstraintsControlRootSlotProps {
  active: boolean
  isMulti: boolean
  horizontal: ConstraintValue
  vertical: ConstraintValue
  actions: ConstraintsControlActions
}
