import React, { useCallback, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  Palette,
  Hash,
  Type,
  ToggleLeft,
  X,
  Plus,
  FolderPlus,
  Trash2,
  Search,
  ChevronDown
} from 'lucide-react'
import { flexRender } from '@tanstack/react-table'

import { useEventListener } from 'usehooks-ts'
import { useVariablesEditor, useI18n } from '@openweave/react'
import type { Color } from '@openweave/scene-graph/primitives'
import type { VariableType } from '@openweave/scene-graph'
import Tip from '@/components/ui/Tip'

import { ColorSwatchPopover } from '@/components/color-picker/ColorSwatchPopover'

// --- Color adapter ---------------------------------------------------------

interface VariableColorInputProps {
  color: Color
  onUpdate: (color: Color) => void
}

/**
 * Adapter that gives the variables table's expected `{ color, onUpdate }`
 * contract while reusing the shared swatch/popover picker.
 */
function VariableColorInput({ color, onUpdate }: VariableColorInputProps) {
  return <ColorSwatchPopover color={color} onChange={onUpdate} />
}

const variableTypeIcons: Record<VariableType, React.ElementType> = {
  COLOR: Palette,
  FLOAT: Hash,
  STRING: Type,
  BOOLEAN: ToggleLeft
}

const variableTypeOptions: { type: VariableType; label: string; description: string }[] = [
  { type: 'COLOR', label: 'Color', description: 'Solid color token' },
  { type: 'FLOAT', label: 'Number', description: 'Numeric value' },
  { type: 'STRING', label: 'Text', description: 'Text value' },
  { type: 'BOOLEAN', label: 'Boolean', description: 'True / false toggle' }
]

// --- Dialog ----------------------------------------------------------------

export interface VariablesDialogProps {
  _brand?: 'VariablesDialog'
  open: boolean
  onClose: () => void
}

const iconButtonClass =
  'flex size-6 shrink-0 cursor-pointer items-center justify-center rounded border-none bg-transparent text-muted transition-colors hover:bg-hover hover:text-surface'

function modeIdOf(columnId: string): string | undefined {
  return columnId.startsWith('mode-') ? columnId.slice(5) : undefined
}

function VariablesEditor({ onClose }: { onClose: () => void }) {
  const ctx = useVariablesEditor({
    colorInput: VariableColorInput,
    icons: variableTypeIcons,
    fallbackIcon: ToggleLeft,
    deleteIcon: X
  })
  const { dialogs, panels } = useI18n()
  const [addOpen, setAddOpen] = useState(false)
  const activeCollection = ctx.collections.find((col) => col.id === ctx.activeCollectionId)

  if (!ctx.hasCollections) {
    return (
      <div className="flex flex-1 flex-col" data-test-id="variables-empty">
        <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold text-surface">{dialogs.localVariables}</h2>
          <button type="button" className={iconButtonClass} aria-label={dialogs.close} onClick={onClose}>
            <X className="size-4" />
          </button>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-muted">
          <FolderPlus className="size-6" />
          <p className="text-xs">{dialogs.noVariableCollections}</p>
          <button
            type="button"
            data-test-id="variables-create-collection"
            className="cursor-pointer rounded bg-hover px-3 py-1.5 text-xs text-surface hover:bg-border"
            onClick={() => ctx.addCollection()}
          >
            {dialogs.createCollection}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Collection tabs + toolbar */}
      <div className="flex shrink-0 items-center border-b border-border">
        <div className="flex flex-1 gap-0.5 overflow-x-auto px-3 py-1">
          {ctx.collections.map((col) =>
            ctx.collectionRename.editingId === col.id ? (
              <input
                key={col.id}
                ref={ctx.collectionRename.focusInput}
                className="w-24 rounded border border-accent bg-input px-2 py-0.5 text-xs text-surface outline-none"
                defaultValue={col.name}
                onBlur={(event) => ctx.collectionRename.commit(col.id, event)}
                onKeyDown={ctx.collectionRename.onKeydown}
              />
            ) : (
              <button
                key={col.id}
                type="button"
                data-test-id="variables-collection-tab"
                data-active={col.id === ctx.activeCollectionId}
                className="cursor-pointer rounded border-none px-2.5 py-1 text-xs whitespace-nowrap text-muted transition-colors data-[active=true]:bg-hover data-[active=true]:text-surface"
                onClick={() => ctx.setActiveCollectionId(col.id)}
                onDoubleClick={() => ctx.startRenameCollection(col.id)}
              >
                {col.name}
              </button>
            )
          )}
        </div>

        <div className="flex items-center gap-1.5 px-3">
          <div className="flex items-center gap-1 rounded border border-border px-2 py-0.5">
            <Search className="size-3 text-muted" />
            <input
              value={ctx.searchTerm}
              data-test-id="variables-search-input"
              className="w-24 border-none bg-transparent text-xs text-surface outline-none placeholder:text-muted"
              placeholder={dialogs.search}
              onChange={(event) => ctx.setSearchTerm(event.target.value)}
            />
          </div>
          <Tip label={dialogs.createCollection}>
            <button
              type="button"
              data-test-id="variables-add-collection"
              className={iconButtonClass}
              onClick={() => ctx.addCollection()}
            >
              <FolderPlus className="size-3.5" />
            </button>
          </Tip>
          <Tip label={dialogs.deleteCollection}>
            <button
              type="button"
              data-test-id="variables-delete-collection"
              className={iconButtonClass}
              onClick={() => ctx.removeCollection(ctx.activeCollectionId)}
            >
              <Trash2 className="size-3.5" />
            </button>
          </Tip>
          <button type="button" className={iconButtonClass} aria-label={dialogs.close} onClick={onClose}>
            <X className="size-4" />
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table
          className="w-full border-collapse"
          style={{ width: `${ctx.table.getCenterTotalSize()}px` }}
        >
          <thead className="sticky top-0 z-10 bg-panel">
            {ctx.table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="border-b border-border">
                {headerGroup.headers.map((header) => {
                  const modeId = modeIdOf(header.column.id)
                  return (
                    <th
                      key={header.id}
                      className="relative px-4 py-2 text-left text-[11px] font-medium text-muted"
                      style={{ width: `${header.getSize()}px` }}
                    >
                      {modeId && ctx.modeRename.editingId === modeId ? (
                        <input
                          ref={ctx.modeRename.focusInput}
                          className="-mx-1 w-full rounded border border-accent bg-input px-1 py-0 text-[11px] font-medium text-surface outline-none"
                          defaultValue={String(header.column.columnDef.header)}
                          onBlur={(event) => ctx.modeRename.commit(modeId, event)}
                          onKeyDown={ctx.modeRename.onKeydown}
                        />
                      ) : (
                        <span
                          className={modeId ? 'cursor-text' : undefined}
                          data-default={modeId === activeCollection?.defaultModeId || undefined}
                          onDoubleClick={
                            modeId ? () => ctx.startRenameMode(modeId) : undefined
                          }
                        >
                          {header.isPlaceholder
                            ? null
                            : flexRender(header.column.columnDef.header, header.getContext())}
                        </span>
                      )}
                    </th>
                  )
                })}
                <th className="w-8 px-1 py-2">
                  <Tip label="Add mode">
                    <button
                      type="button"
                      data-test-id="variables-add-mode"
                      className="flex size-5 cursor-pointer items-center justify-center rounded border-none bg-transparent text-muted hover:bg-hover hover:text-surface"
                      onClick={() => ctx.addMode()}
                    >
                      <Plus className="size-3" />
                    </button>
                  </Tip>
                </th>
              </tr>
            ))}
          </thead>
          <tbody>
            {ctx.table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                data-test-id="variable-row"
                className="group border-b border-border hover:bg-hover/40"
              >
                {row.getVisibleCells().map((cell) => (
                  <td
                    key={cell.id}
                    className="px-4 py-1.5"
                    style={{ width: `${cell.column.getSize()}px` }}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
                <td />
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add variable footer */}
      <div className="relative flex w-full shrink-0 items-center justify-between gap-2 border-t border-border px-4 py-2">
        <span className="text-xs text-muted">{panels.createVariable}</span>
        <div className="relative">
          <button
            type="button"
            data-test-id="variables-add-variable"
            className="flex cursor-pointer items-center gap-1.5 rounded bg-hover px-2.5 py-1.5 text-xs text-surface hover:bg-border"
            onClick={() => setAddOpen((open) => !open)}
          >
            <Plus className="size-3.5" />
            {panels.add}
            <ChevronDown className="size-3" />
          </button>
          {addOpen && (
            <div className="absolute right-0 bottom-full mb-2 w-48 rounded border border-border bg-surface py-1 shadow-lg">
              {variableTypeOptions.map((item) => {
                const Icon = variableTypeIcons[item.type]
                return (
                  <button
                    key={item.type}
                    type="button"
                    data-test-id={`variables-add-${item.type.toLowerCase()}`}
                    className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-xs text-surface hover:bg-hover"
                    onClick={() => {
                      ctx.addVariable(item.type)
                      setAddOpen(false)
                    }}
                  >
                    <Icon className="size-3.5 text-muted" />
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span>{item.label}</span>
                      <span className="truncate text-[10px] text-muted">{item.description}</span>
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export function VariablesDialog({ open, onClose }: VariablesDialogProps) {
  const { dialogs } = useI18n()
  const onKey = useCallback(
    (event: KeyboardEvent) => {
      if (!open) return
      if (event.key === 'Escape') onClose()
    },
    [open, onClose]
  )
  useEventListener('keydown', onKey)

  if (!open) return null

  // Portal to <body> so the fixed overlay escapes panels that set
  // `contain: paint layout` (which would otherwise clamp it to the panel box).
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      data-test-id="variables-dialog"
      onClick={onClose}
    >
      <div
        className="flex h-[32rem] w-[50rem] max-w-[90vw] flex-col overflow-hidden rounded-lg border border-border bg-surface shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-label={dialogs.localVariables}
        onClick={(event) => event.stopPropagation()}
      >
        <VariablesEditor onClose={onClose} />
      </div>
    </div>,
    document.body
  )
}

export default VariablesDialog
