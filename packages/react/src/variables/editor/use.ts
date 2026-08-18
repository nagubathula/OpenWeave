import { useVariablesDialogState } from '#react/variables/dialog/use'
import { useVariablesTable } from '#react/variables/table/use'
import { useReactTable, getCoreRowModel } from '@tanstack/react-table'
import { useMemo } from 'react'

/**
 * Composes variables dialog state, table columns, and TanStack table wiring
 * into a single higher-level variables editor API.
 */
export function useVariablesEditor(options: {
  /** Component used for color variable editing. */
  colorInput: React.ElementType
  /** Icon map keyed by variable resolved type. */
  icons: Record<string, React.ElementType>
  /** Fallback icon when no specific icon matches a variable type. */
  fallbackIcon: React.ElementType
  /** Icon used for destructive remove actions. */
  deleteIcon: React.ElementType
}) {
  const ctx = useVariablesDialogState()

  const { columns } = useVariablesTable({
    activeModes: ctx.activeModes,
    formatModeValue: ctx.formatModeValue,
    parseVariableValue: ctx.parseVariableValue,
    shortName: ctx.shortName,
    renameVariable: ctx.renameVariable,
    updateVariableValue: ctx.updateVariableValue,
    removeVariable: ctx.removeVariable,
    ColorInput: options.colorInput,
    icons: options.icons,
    fallbackIcon: options.fallbackIcon,
    deleteIcon: options.deleteIcon
  })

  const tableData = ctx.variables
  const tableColumns = columns

  const table = useReactTable({
    data: tableData,
    columns: tableColumns,
    columnResizeMode: 'onChange',
    getCoreRowModel: getCoreRowModel(),
    defaultColumn: {
      minSize: 60,
      maxSize: 800
    },
    getRowId: (row) => row.id
  })

  const hasCollections = useMemo(() => ctx.collections.length > 0, [ctx.collections])

  return {
    ...ctx,
    columns,
    table,
    hasCollections
  }
}
