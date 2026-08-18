import { Lock, MoveHorizontal, WrapText } from 'lucide-react'
import React from 'react'

import { useI18n, useLayoutControlsContext } from '@openweave/react'
import type { SceneNode } from '@openweave/scene-graph'

import { PanelFieldGroup } from '@/components/ui/panel/PanelFieldGroup'
import SegmentedControl from '@/components/ui/SegmentedControl'
import type { SegmentedControlOption } from '@/components/ui/SegmentedControl'

type TextResizeMode = 'AUTO_WIDTH' | 'AUTO_HEIGHT' | 'FIXED'

function modeFor(node: SceneNode): TextResizeMode {
  if (node.textAutoResize === 'WIDTH_AND_HEIGHT') return 'AUTO_WIDTH'
  if (node.textAutoResize === 'HEIGHT' || node.textAutoResize === 'TRUNCATE') return 'AUTO_HEIGHT'
  return 'FIXED'
}

const MODE_TO_AUTO_RESIZE: Record<TextResizeMode, SceneNode['textAutoResize']> = {
  AUTO_WIDTH: 'WIDTH_AND_HEIGHT',
  AUTO_HEIGHT: 'HEIGHT',
  FIXED: 'NONE'
}

/** Text auto-resize control (Auto width / Auto height / Fixed) — TEXT nodes only. */
export default function TextResizingControl() {
  const ctx = useLayoutControlsContext()
  const { panels } = useI18n()
  const { node, editor } = ctx
  const mode = modeFor(node)

  const options: SegmentedControlOption[] = [
    {
      value: 'AUTO_WIDTH',
      label: panels.resizeAutoWidth,
      icon: <MoveHorizontal className="size-3.5" />
    },
    {
      value: 'AUTO_HEIGHT',
      label: panels.resizeAutoHeight,
      icon: <WrapText className="size-3.5" />
    },
    { value: 'FIXED', label: panels.resizeFixed, icon: <Lock className="size-3.5" /> }
  ]

  function setMode(value: string) {
    editor.updateNodeWithUndo(
      node.id,
      { textAutoResize: MODE_TO_AUTO_RESIZE[value as TextResizeMode] },
      'Set text resizing'
    )
  }

  return (
    <PanelFieldGroup label={panels.resizing} className="mb-3">
      <SegmentedControl value={mode} options={options} label={panels.resizing} onChange={setMode} />
    </PanelFieldGroup>
  )
}
