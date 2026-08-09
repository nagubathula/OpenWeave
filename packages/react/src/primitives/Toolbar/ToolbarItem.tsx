import React, { useMemo } from 'react'
import { useToolbar } from '#react/primitives/Toolbar/context'
import type { Tool } from '@openweave/core/editor'

export interface ToolbarItemSlotProps {
  active: boolean
  tool: Tool
  actions: {
    select: () => void
  }
}

export interface ToolbarItemProps {
  tool: Tool
  children?: React.ReactNode | ((props: ToolbarItemSlotProps) => React.ReactNode)
}

export function ToolbarItem({ tool, children }: ToolbarItemProps) {
  const { activeTool, setTool } = useToolbar()

  const isActive = activeTool === tool
  
  const actions = useMemo(() => ({
    select: () => setTool(tool)
  }), [setTool, tool])

  const renderedChildren = typeof children === 'function' ? children({
    active: isActive,
    tool,
    actions
  }) : children

  return <>{renderedChildren}</>
}

export default ToolbarItem
