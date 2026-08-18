import { useEditor } from '#react/editor/context'
import { useSceneComputed } from '#react/internal/scene-computed/use'
import { ToolbarProvider } from '#react/primitives/toolbar/context'
import React, { useMemo, useState, useEffect, useRef } from 'react'

import { EDITOR_TOOLS } from '@openweave/core/editor'
import type { EditorToolDef, Tool } from '@openweave/core/editor'

export interface ToolbarRootSlotProps {
  tools: EditorToolDef[]
  activeTool: Tool
  flyoutSelections: Map<Tool, Tool>
  expandedFlyout: Tool | null
  actions: {
    setTool: (tool: Tool) => void
    toggleFlyout: (tool: Tool) => void
    closeFlyout: () => void
  }
}

export interface ToolbarRootProps {
  tools?: EditorToolDef[]
  children?: React.ReactNode | ((props: ToolbarRootSlotProps) => React.ReactNode)
}

export function ToolbarRoot({ tools = EDITOR_TOOLS, children }: ToolbarRootProps) {
  const editor = useEditor()
  const activeTool = useSceneComputed(() => editor.state.activeTool)
  const [expandedFlyout, setExpandedFlyout] = useState<Tool | null>(null)

  // Keep track of which tool was selected in a flyout
  const flyoutSelections = useRef(new Map<Tool, Tool>())

  useEffect(() => {
    for (const tool of tools) {
      if (tool.flyout?.includes(activeTool)) {
        flyoutSelections.current.set(tool.key, activeTool)
      }
    }
  }, [activeTool, tools])

  const setTool = (tool: Tool) => {
    editor.setTool(tool)
    setExpandedFlyout(null)
  }

  const toggleFlyout = (tool: Tool) => {
    setExpandedFlyout((prev) => (prev === tool ? null : tool))
  }

  const closeFlyout = () => {
    setExpandedFlyout(null)
  }

  const actions = useMemo(
    () => ({
      setTool,
      toggleFlyout,
      closeFlyout
    }),
    [editor]
  )

  const contextValue = useMemo(
    () => ({
      editor,
      tools,
      activeTool,
      flyoutSelections: flyoutSelections.current,
      expandedFlyout,
      setTool,
      toggleFlyout,
      closeFlyout
    }),
    [editor, tools, activeTool, expandedFlyout]
  )

  const renderedChildren =
    typeof children === 'function'
      ? children({
          tools,
          activeTool,
          flyoutSelections: flyoutSelections.current,
          expandedFlyout,
          actions
        })
      : children

  return <ToolbarProvider value={contextValue}>{renderedChildren}</ToolbarProvider>
}

export default ToolbarRoot
