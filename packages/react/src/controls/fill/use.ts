import { useColorVariableBinding } from '#react/controls/color-variable-binding/use'

import { DEFAULT_SHAPE_FILL } from '@openweave/core/constants'

/**
 * Returns fill-related panel helpers and a reusable default fill value.
 *
 * This composable extends variable-binding behavior with SDK-level defaults for
 * fill editing UIs.
 */
export function useFillControls() {
  const ctx = useColorVariableBinding('fills')

  return {
    ...ctx,
    defaultFill: DEFAULT_SHAPE_FILL
  }
}
