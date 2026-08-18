import { createVariableColumns, type VariablesTableOptions } from '#react/variables/table/helpers'
import { useMemo } from 'react'

export function useVariablesTable(options: VariablesTableOptions) {
  const columns = useMemo(() => createVariableColumns(options), [options])

  return { columns }
}
