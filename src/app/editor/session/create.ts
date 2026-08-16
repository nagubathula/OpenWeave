import { createEditor } from '@openweave/core/editor'
import { BUILTIN_IO_FORMATS, IORegistry } from '@openweave/core/io'
import { SceneGraph } from '@openweave/scene-graph'

import {
  getActiveEditorStore,
  setActiveEditorStore,
  useEditorStore
} from '@/app/editor/active-store'
import { resolveFigmaClipboardImages } from '@/app/editor/clipboard/figma-images'
import { bindClipboardNotifications } from '@/app/editor/clipboard/notifications'
import { loadFont } from '@/app/editor/fonts'
import {
  defineEditorDerivedAccessors,
  createEditorStoreModules,
  defineEditorStoreAccessors
} from '@/app/editor/session/modules'
import { createObservableState } from '@/app/editor/session/observable-state'
import { createInitialAppEditorState, type AppEditorState } from '@/app/editor/session/types'
import { IS_TAURI } from '@/constants'

export { EDITOR_TOOLS as TOOLS, TOOL_SHORTCUTS } from '@openweave/core/editor'
export type { EditorToolDef as ToolDef, Tool } from '@openweave/core/editor'

export function createEditorStore(initialGraph?: SceneGraph) {
  const graph = initialGraph ?? new SceneGraph()

  const { state, subscribe: subscribeState } = createObservableState<AppEditorState>(
    createInitialAppEditorState(graph.getPages()[0].id)
  )

  const viewportSize = { width: 0, height: 0 }
  const editor = createEditor({
    graph,
    state,
    loadFont,
    resolveFigmaClipboardImages: IS_TAURI ? resolveFigmaClipboardImages : undefined,
    skipInitialGraphSetup: !!initialGraph,
    getViewportSize: () =>
      viewportSize.width > 0 && viewportSize.height > 0
        ? viewportSize
        : { width: window.innerWidth, height: window.innerHeight }
  })
  const io = new IORegistry(BUILTIN_IO_FORMATS)
  bindClipboardNotifications(editor)

  if (initialGraph) {
    editor.subscribeToGraph()
  }

  const modules = createEditorStoreModules(editor, state, io, viewportSize)

  // ─── Public API ───────────────────────────────────────────────
  // Spread all core Editor methods, then override getters and add app-specific.

  const store = {
    ...editor,
    state,
    subscribeState,

    // App-specific overrides and additions
    ...modules
  }

  defineEditorStoreAccessors(store, editor)
  defineEditorDerivedAccessors(store, editor)

  return store as typeof store & {
    readonly selectedNodes: ReturnType<typeof editor.getSelectedNodes>
    readonly selectedNode: ReturnType<typeof editor.getSelectedNodes>[number] | undefined
    readonly layerTree: ReturnType<typeof editor.getLayerTree>
  }
}

export type EditorStore = ReturnType<typeof createEditorStore>

export { getActiveEditorStore, setActiveEditorStore, useEditorStore }
