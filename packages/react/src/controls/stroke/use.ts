import { useMemo, useRef, useState } from 'react'

import { useNodeProps } from '#react/controls/node-props/use'
import {
  BORDER_SIDES,
  DEFAULT_STROKE,
  SIDE_OPTIONS,
  borderWeight,
  createStrokeGeometryActions,
  createStrokeGeometryState,
  createStrokeSideActions,
  currentAlign,
  currentSides,
  dashState,
  setDash,
  setGap,
  toggleDash,
  updateAlign
} from '#react/controls/stroke/helpers'
import { useEditor } from '#react/editor/context'
import { useI18n } from '#react/i18n'

/**
 * Returns stroke-related helpers for property panels.
 *
 * Provides alignment and side helpers plus mixed-selection state and
 * undo-aware actions for caps, joins, and miter limits.
 */
export function useStrokeControls() {
  const store = useEditor()
  const { nodes, merged } = useNodeProps()
  const { panels } = useI18n()
  const [sideMenuOpen, setSideMenuOpen] = useState(false)

  const alignOptions = [
    { value: 'INSIDE' as const, label: panels.strokeAlignInside },
    { value: 'CENTER' as const, label: panels.strokeAlignCenter },
    { value: 'OUTSIDE' as const, label: panels.strokeAlignOutside }
  ]
  const capOptions = [
    { value: 'NONE' as const, label: panels.strokeCapButt },
    { value: 'ROUND' as const, label: panels.strokeCapRound },
    { value: 'SQUARE' as const, label: panels.strokeCapSquare }
  ]
  const joinOptions = [
    { value: 'MITER' as const, label: panels.strokeJoinMiter },
    { value: 'BEVEL' as const, label: panels.strokeJoinBevel },
    { value: 'ROUND' as const, label: panels.strokeJoinRound }
  ]

  const geometryState = createStrokeGeometryState({ nodes, merged })

  // Memoized so the in-flight miter scrub state survives re-renders; the getter
  // always reads the current selection.
  const nodesRef = useRef(nodes)
  nodesRef.current = nodes
  const geometryActions = useMemo(
    () => createStrokeGeometryActions(store, () => nodesRef.current),
    [store]
  )
  const { selectSide, updateBorderWeight } = useMemo(
    () => createStrokeSideActions(store, () => setSideMenuOpen(false)),
    [store]
  )

  return {
    alignOptions,
    capOptions,
    joinOptions,
    ...geometryState,
    ...geometryActions,
    sideOptions: SIDE_OPTIONS,
    borderSides: BORDER_SIDES,
    sideMenuOpen,
    setSideMenuOpen,
    defaultStroke: DEFAULT_STROKE,
    updateAlign: updateAlign.bind(null, store),
    currentAlign,
    currentSides,
    dashState,
    toggleDash,
    setDash,
    setGap,
    borderWeight,
    selectSide,
    updateBorderWeight
  }
}
