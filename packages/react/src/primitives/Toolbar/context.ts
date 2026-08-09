import { createContext, useContext } from 'react'

import type { Editor, EditorToolDef, Tool } from '@openweave/core/editor'

export interface ToolbarContext {
  editor: Editor
  tools: EditorToolDef[]
  activeTool: Tool
  flyoutSelections: Map<Tool, Tool>
  expandedFlyout: Tool | null
  setTool: (tool: Tool) => void
  toggleFlyout: (tool: Tool) => void
  closeFlyout: () => void
}

const ToolbarContextReact = createContext<ToolbarContext | null>(null)

export function useToolbar(): ToolbarContext {
  const ctx = useContext(ToolbarContextReact)
  if (!ctx) throw new Error('[openweave] useToolbar() called outside <ToolbarRoot>')
  return ctx
}

export const ToolbarProvider = ToolbarContextReact.Provider
