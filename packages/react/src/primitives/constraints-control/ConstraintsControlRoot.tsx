import { useConstraints } from '#react/controls/constraints/use'
import React from 'react'

import type { ConstraintsControlActions, ConstraintsControlRootSlotProps } from './types'

export interface ConstraintsControlRootProps {
  children?: React.ReactNode | ((props: ConstraintsControlRootSlotProps) => React.ReactNode)
}

export function ConstraintsControlRoot({ children }: ConstraintsControlRootProps) {
  const constraints = useConstraints()

  const actions: ConstraintsControlActions = {
    setHorizontal: (value) => constraints.setAxis('horizontal', value),
    setVertical: (value) => constraints.setAxis('vertical', value),
    setCenter: (axis) => constraints.setAxis(axis, 'CENTER'),
    togglePin: constraints.togglePin
  }

  const renderedChildren =
    typeof children === 'function'
      ? children({
          active: constraints.active,
          isMulti: constraints.isMulti,
          horizontal: constraints.horizontal,
          vertical: constraints.vertical,
          actions
        })
      : children

  return <>{renderedChildren}</>
}

export default ConstraintsControlRoot
