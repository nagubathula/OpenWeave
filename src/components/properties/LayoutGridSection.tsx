import React from 'react'
import { useEditor, useSelectionState, useI18n } from '@openweave/react'
import type { LayoutGrid } from '@openweave/scene-graph'
import { Plus, Eye, EyeOff, Minus, Columns3, Rows3, LayoutGrid as LayoutGridIcon } from 'lucide-react'

import PanelSection from '@/components/ui/panel/PanelSection'
import IconButton from '@/components/ui/IconButton'
import SegmentedControl from '@/components/ui/SegmentedControl'
import NumberField from '@/components/inputs/NumberField'

export default function LayoutGridSection() {
  const editor = useEditor()
  const { selectedNode: node } = useSelectionState()
  const { panels } = useI18n()

  if (!node) return null

  const grids = ('layoutGrids' in node ? (node.layoutGrids) : undefined) ?? []

  const commit = (next: LayoutGrid[], label: string) => {
    editor.updateNodeWithUndo(node.id, { layoutGrids: next }, label)
  }

  const defaultGrid = (): LayoutGrid => ({
    visible: true,
    color: { r: 1, g: 0, b: 0, a: 0.1 },
    pattern: 'COLUMNS',
    alignment: 'STRETCH',
    count: 5,
    gutterSize: 20,
    offset: 0,
    sectionSize: 0
  })

  const add = () => {
    commit([...grids, defaultGrid()], 'Add layout guide')
  }

  const remove = (index: number) => {
    commit(grids.filter((_, i) => i !== index), 'Remove layout guide')
  }

  const patch = (index: number, changes: Partial<LayoutGrid>, label = 'Edit layout guide') => {
    commit(grids.map((grid, i) => (i === index ? { ...grid, ...changes } : grid)), label)
  }

  const gridPattern = (grid: LayoutGrid): 'COLUMNS' | 'ROWS' | 'GRID' => {
    if (grid.pattern) return grid.pattern
    return grid.axis === 'Y' ? 'ROWS' : 'COLUMNS'
  }

  const isGrid = (grid: LayoutGrid): boolean => {
    return gridPattern(grid) === 'GRID'
  }

  return (
    <PanelSection
      label={panels.layoutGrids}
      actions={
        <IconButton label={panels.addLayoutGrid} onClick={add}>
          <Plus className="size-3.5" />
        </IconButton>
      }
    >
      <div className="space-y-3">
        {grids.map((grid, index) => (
          <div key={index} className="flex gap-2 relative group items-start border-b border-border/50 pb-3 last:border-0 last:pb-0">
            <div className="flex-1 space-y-2">
              <SegmentedControl
                value={gridPattern(grid)}
                onChange={(val) => patch(index, { pattern: val as any }, 'Change grid pattern')}
                options={[
                  { value: 'COLUMNS', label: panels.gridColumns, icon: <Columns3 className="size-3.5" /> },
                  { value: 'ROWS', label: panels.gridRows, icon: <Rows3 className="size-3.5" /> },
                  { value: 'GRID', label: panels.gridGrid, icon: <LayoutGridIcon className="size-3.5" /> }
                ]}
              />

              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] text-muted">{panels.gridCount}</span>
                  <div className="bg-input/50 rounded px-1.5 py-1 border border-border focus-within:border-accent transition-colors">
                    <NumberField
                      value={grid.count ?? grid.numSections ?? 1}
                      min={1}
                      onChange={(v) => patch(index, { count: v })}
                    />
                  </div>
                </div>

                {!isGrid(grid) && (
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] text-muted">{panels.gridGutter}</span>
                    <div className="bg-input/50 rounded px-1.5 py-1 border border-border focus-within:border-accent transition-colors">
                      <NumberField
                        value={grid.gutterSize ?? 0}
                        min={0}
                        onChange={(v) => patch(index, { gutterSize: v })}
                      />
                    </div>
                  </div>
                )}

                {isGrid(grid) && (
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] text-muted">{panels.gridSectionSize}</span>
                    <div className="bg-input/50 rounded px-1.5 py-1 border border-border focus-within:border-accent transition-colors">
                      <NumberField
                        value={grid.sectionSize ?? 0}
                        min={1}
                        onChange={(v) => patch(index, { sectionSize: v })}
                      />
                    </div>
                  </div>
                )}

                <div className="flex flex-col gap-1">
                  <span className="text-[10px] text-muted">{panels.gridMargin}</span>
                  <div className="bg-input/50 rounded px-1.5 py-1 border border-border focus-within:border-accent transition-colors">
                    <NumberField
                      value={grid.offset ?? 0}
                      onChange={(v) => patch(index, { offset: v })}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-0.5 pt-1">
              <IconButton
                label={panels.toggleVisibility}
                onClick={() => patch(index, { visible: grid.visible === false }, 'Toggle layout guide')}
                className={grid.visible === false ? 'opacity-50' : ''}
              >
                {grid.visible !== false ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
              </IconButton>
              <IconButton label={panels.removeLayoutGrid} onClick={() => remove(index)}>
                <Minus className="size-3.5" />
              </IconButton>
            </div>
          </div>
        ))}
      </div>
    </PanelSection>
  )
}
