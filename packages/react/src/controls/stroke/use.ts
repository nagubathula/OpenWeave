import { ref } from 'vue'

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
 * This composable provides alignment and side helpers plus mixed-selection
 * state and undo-aware actions for caps, joins, and miter limits.
 */
export function useStrokeControls() {
  const store = useEditor()
  const { nodes, merged } = useNodeProps()
  const { panels } = useI18n()
  const sideMenuOpen = ref(false)
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
  const geometryActions = createStrokeGeometryActions(store, nodes)
  const { selectSide, updateBorderWeight } = createStrokeSideActions(store, sideMenuOpen)

  return {
    alignOptions,
    capOptions,
    joinOptions,
    ...geometryState,
    ...geometryActions,
    sideOptions: SIDE_OPTIONS,
    borderSides: BORDER_SIDES,
    sideMenuOpen,
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
