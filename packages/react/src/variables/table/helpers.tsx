import type { ColumnDef } from '@tanstack/react-table'
import React, { useEffect, useState, type ElementType } from 'react'

import type { Variable, VariableValue } from '@openweave/scene-graph'
import type { Color } from '@openweave/scene-graph/primitives'

export interface VariablesTableOptions {
  activeModes: { modeId: string; name: string }[]
  formatModeValue: (variable: Variable, modeId: string) => string
  parseVariableValue: (variable: Variable, raw: string) => VariableValue | undefined
  shortName: (variable: Variable) => string
  renameVariable: (id: string, newName: string) => void
  updateVariableValue: (id: string, modeId: string, value: VariableValue) => void
  removeVariable: (id: string) => void
  ColorInput: ElementType
  icons: Record<string, ElementType>
  fallbackIcon: ElementType
  deleteIcon: ElementType
}

/**
 * Lightweight inline text editor: renders a preview until clicked, then swaps to
 * an input that commits on blur/Enter and cancels on Escape. Replaces the Vue
 * reka-ui `Editable*` primitives the table previously rendered via `h()`.
 */
function InlineEditable({
  value,
  onSubmit,
  previewClass,
  inputClass
}: {
  value: string
  onSubmit: (value: string) => void
  previewClass: string
  inputClass: string
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)

  useEffect(() => {
    if (!editing) setDraft(value)
  }, [value, editing])

  if (!editing) {
    return (
      <span
        className={previewClass}
        onClick={() => {
          setDraft(value)
          setEditing(true)
        }}
      >
        {value}
      </span>
    )
  }

  const commit = () => {
    setEditing(false)
    if (draft !== value) onSubmit(draft)
  }

  return (
    <input
      className={inputClass}
      value={draft}
      autoFocus
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault()
          commit()
        } else if (e.key === 'Escape') {
          e.preventDefault()
          setEditing(false)
        }
      }}
    />
  )
}

function commitNameEdit(options: VariablesTableOptions, variable: Variable, newName: string) {
  if (newName && newName !== variable.name) {
    options.renameVariable(variable.id, newName)
  }
}

function commitValueEdit(
  options: VariablesTableOptions,
  variable: Variable,
  modeId: string,
  newValue: string
) {
  const parsed = options.parseVariableValue(variable, newValue)
  if (parsed !== undefined) {
    options.updateVariableValue(variable.id, modeId, parsed)
  }
}

function createVariableNameColumn(options: VariablesTableOptions): ColumnDef<Variable> {
  return {
    id: 'name',
    header: 'Name',
    size: 200,
    minSize: 120,
    maxSize: 400,
    cell: ({ row }) => {
      const variable = row.original
      const Icon = options.icons[variable.type] ?? options.fallbackIcon
      return (
        <div className="flex items-center gap-2">
          <Icon className="size-3.5 shrink-0 text-muted" />
          <div className="min-w-0 flex-1">
            <InlineEditable
              value={options.shortName(variable)}
              onSubmit={(value) => commitNameEdit(options, variable, value)}
              previewClass="min-w-0 flex-1 cursor-text truncate text-xs text-surface"
              inputClass="min-w-0 flex-1 rounded border border-border bg-surface/10 px-1 py-0.5 text-xs text-surface outline-none"
            />
          </div>
        </div>
      )
    }
  }
}

function createVariableModeColumns(options: VariablesTableOptions): ColumnDef<Variable>[] {
  return options.activeModes.map((mode) => ({
    id: `mode-${mode.modeId}`,
    header: mode.name,
    size: 200,
    minSize: 120,
    maxSize: 500,
    cell: ({ row }) => {
      const variable = row.original
      const value = variable.valuesByMode[mode.modeId]

      if (variable.type === 'COLOR' && value && typeof value === 'object' && 'r' in value) {
        const ColorInput = options.ColorInput
        return (
          <ColorInput
            color={value}
            onUpdate={(color: Color) =>
              options.updateVariableValue(variable.id, mode.modeId, color)
            }
          />
        )
      }

      return (
        <div className="min-w-0 flex-1">
          <InlineEditable
            value={options.formatModeValue(variable, mode.modeId)}
            onSubmit={(submitted) => commitValueEdit(options, variable, mode.modeId, submitted)}
            previewClass="min-w-0 flex-1 cursor-text truncate font-mono text-xs text-muted"
            inputClass="min-w-0 flex-1 rounded border border-border bg-surface/10 px-1 py-0.5 font-mono text-xs text-surface outline-none"
          />
        </div>
      )
    }
  }))
}

function createDeleteColumn(options: VariablesTableOptions): ColumnDef<Variable> {
  const DeleteIcon = options.deleteIcon
  return {
    id: 'actions',
    header: '',
    size: 36,
    minSize: 36,
    maxSize: 36,
    enableResizing: false,
    cell: ({ row }) => (
      <button
        type="button"
        className="flex size-5 cursor-pointer items-center justify-center rounded border-none bg-transparent text-muted opacity-0 transition-opacity group-hover:opacity-100 hover:text-surface"
        onClick={() => options.removeVariable(row.original.id)}
      >
        <DeleteIcon className="size-3" />
      </button>
    )
  }
}

export function createVariableColumns(options: VariablesTableOptions): ColumnDef<Variable>[] {
  return [
    createVariableNameColumn(options),
    ...createVariableModeColumns(options),
    createDeleteColumn(options)
  ]
}
