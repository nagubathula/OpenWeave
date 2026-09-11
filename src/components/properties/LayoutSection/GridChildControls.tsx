import React from 'react'

import { useLayoutControlsContext } from '@openweave/react'
import type { GridPosition } from '@openweave/scene-graph'

import NumberField from '@/components/inputs/NumberField'
import PanelGrid from '@/components/ui/panel/PanelGrid'

export default function GridChildControls() {
  const ctx = useLayoutControlsContext()
  const { node, editor } = ctx

  const parent = node.parentId ? editor.graph.getNode(node.parentId) : null
  if (parent?.layoutMode !== 'GRID') return null

  const pos: GridPosition = node.gridPosition ?? {
    column: 1,
    row: 1,
    columnSpan: 1,
    rowSpan: 1
  }

  const updateGridPosition = (patch: Partial<GridPosition>) => {
    const next: GridPosition = {
      ...pos,
      ...patch
    }
    editor.updateNodeWithUndo(node.id, { gridPosition: next }, 'Change grid position')
  }

  return (
    <div className="mt-3 border-t border-border pt-2" data-test-id="grid-child-controls">
      <div className="mb-2 text-[11px] font-medium text-muted">Grid position & span</div>
      <PanelGrid columns={2} className="mb-2">
        <div>
          <label className="mb-1 block text-[10px] text-muted">Column</label>
          <NumberField
            value={pos.column}
            min={1}
            step={1}
            onChange={(v) => updateGridPosition({ column: Math.max(1, Math.round(v)) })}
          />
        </div>
        <div>
          <label className="mb-1 block text-[10px] text-muted">Row</label>
          <NumberField
            value={pos.row}
            min={1}
            step={1}
            onChange={(v) => updateGridPosition({ row: Math.max(1, Math.round(v)) })}
          />
        </div>
      </PanelGrid>
      <PanelGrid columns={2}>
        <div>
          <label className="mb-1 block text-[10px] text-muted">Column span</label>
          <NumberField
            value={pos.columnSpan}
            min={1}
            step={1}
            onChange={(v) => updateGridPosition({ columnSpan: Math.max(1, Math.round(v)) })}
          />
        </div>
        <div>
          <label className="mb-1 block text-[10px] text-muted">Row span</label>
          <NumberField
            value={pos.rowSpan}
            min={1}
            step={1}
            onChange={(v) => updateGridPosition({ rowSpan: Math.max(1, Math.round(v)) })}
          />
        </div>
      </PanelGrid>
    </div>
  )
}
