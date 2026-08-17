import { useRef, useState } from 'react'

import type { ColorFieldFormat } from '#react/controls/color-model/types'
import {
  OKHCL_FIELD_OPTIONS,
  createOkHCLActions,
  createOkHCLFieldFormats,
  createOkHCLPreviewHelpers,
  getFillOkHCLColor,
  getStrokeOkHCLColor
} from '#react/controls/okhcl/helpers'
import { useEditor } from '#react/editor/context'

export function useOkHCL() {
  const editor = useEditor()
  const fieldFormatsRef = useRef(new Map<string, ColorFieldFormat>())
  const [, setTick] = useState(0)

  const { ensureFillOkHCL, ensureStrokeOkHCL, updateFillOkHCL, updateStrokeOkHCL } =
    createOkHCLActions(editor)
  const { getFillPreviewInfo, getStrokePreviewInfo } = createOkHCLPreviewHelpers(editor)
  const { getFieldFormat, setFillFieldFormat, setStrokeFieldFormat } = createOkHCLFieldFormats(
    fieldFormatsRef,
    ensureFillOkHCL,
    ensureStrokeOkHCL,
    () => setTick(t => t + 1)
  )

  return {
    getFillOkHCLColor,
    getStrokeOkHCLColor,
    getFillPreviewInfo,
    getStrokePreviewInfo,
    getFieldFormat,
    setFillFieldFormat,
    setStrokeFieldFormat,
    updateFillOkHCL,
    updateStrokeOkHCL,
    fieldOptions: OKHCL_FIELD_OPTIONS
  }
}

export type OkHCLControls = ReturnType<typeof useOkHCL>
