import { useEditor } from '#react/editor/context'

import { TYPOGRAPHY_WEIGHTS, useTypographyActions, useTypographyState } from './actions'

/**
 * Options for {@link useTypography}.
 */
export interface TypographyFontLoader {
  load: (family: string, style: string) => Promise<unknown>
}

export interface UseTypographyOptions {
  /**
   * Optional font loader invoked before changing family or weight.
   */
  fontLoader?: TypographyFontLoader
}

/**
 * Returns typography-related state and actions for the current text selection.
 *
 * This composable is designed for text property panels and formatting controls.
 */
export function useTypography(options: UseTypographyOptions = {}) {
  const editor = useEditor()
  const typographyState = useTypographyState(editor)
  const actions = useTypographyActions({ editor, ...typographyState, options })

  return {
    editor,
    ...typographyState,
    weights: TYPOGRAPHY_WEIGHTS,
    ...actions
  }
}
