import React from 'react'

import { useI18n, useLayoutControlsContext } from '@openweave/react'

export default function ClipContentControl() {
  const ctx = useLayoutControlsContext()
  const { panels } = useI18n()
  const { node, editor } = ctx

  return (
    <label className="mt-2 flex cursor-pointer items-center gap-2 text-xs text-surface">
      <input
        type="checkbox"
        data-test-id="clip-content-checkbox"
        className="accent-accent"
        checked={node.clipsContent}
        onChange={() =>
          editor.updateNodeWithUndo(
            node.id,
            { clipsContent: !node.clipsContent },
            'Toggle clip content'
          )
        }
      />
      {panels.clipContent}
    </label>
  )
}
