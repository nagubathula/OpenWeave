import type { ConstraintType } from '@openweave/scene-graph'

import type {
  ConstraintAxis,
  ConstraintEdge,
  ConstraintValue
} from '#react/controls/constraints/model'

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
