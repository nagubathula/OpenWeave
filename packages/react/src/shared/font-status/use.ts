import { useMemo } from 'react'

import { DEFAULT_FONT_FAMILY } from '@openweave/core/constants'
import { fontManager } from '@openweave/core/text'
import type { SceneNode } from '@openweave/scene-graph'

export function useNodeFontStatus(node: SceneNode | null | undefined) {
  const missingFonts = useMemo(() => {
    if (node?.type !== 'TEXT') return []

    const families = new Set<string>()
    families.add(node.fontFamily || DEFAULT_FONT_FAMILY)
    for (const run of node.styleRuns) {
      if (run.style.fontFamily) families.add(run.style.fontFamily)
    }

    return [...families].filter((f) => !fontManager.isLoaded(f))
  }, [node])

  const hasMissingFonts = missingFonts.length > 0

  return { missingFonts, hasMissingFonts }
}
