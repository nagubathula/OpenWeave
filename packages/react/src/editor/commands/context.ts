import type { useSelectionCapabilities } from '#react/editor/selection-capabilities/use'
import type { useSelectionState } from '#react/editor/selection-state/use'

import type { Editor } from '@openweave/core/editor'

export type CommandMessagesStore = { value: Record<string, string> }
export type SelectionState = ReturnType<typeof useSelectionState>
export type SelectionCapabilities = ReturnType<typeof useSelectionCapabilities>

export type EditorCommandMapOptions = {
  editor: Editor
  selection: SelectionState
  capabilities: SelectionCapabilities
  messages: CommandMessagesStore
  otherPages: Array<{ id: string; name: string }>
  moveSelectionToPage: (pageId: string) => void
  getOpacityTarget: () => { value: number; coalesceKey?: string }
}
