import type { Editor } from '@openweave/core/editor'
import type { IORegistry } from '@openweave/core/io'

import { createDocumentExportActions } from '@/app/document/export'
import { createDocumentIOActions } from '@/app/document/io'
import type { ViewportSize } from '@/app/document/io/types'
import { createFlashActions } from '@/app/editor/flash'
import { createMobileClipboardActions } from '@/app/editor/mobile-clipboard'
import { createPenActions } from '@/app/editor/pen'
import { createProfilerActions } from '@/app/editor/profiler'
import type { AppEditorState } from '@/app/editor/session/types'
import { createVectorEditActions } from '@/app/editor/vector-edit'

export function defineEditorStoreAccessors(store: object, editor: Editor) {
  Object.defineProperties(store, {
    graph: {
      enumerable: true,
      get: () => editor.graph
    },
    renderer: {
      enumerable: true,
      get: () => editor.renderer
    },
    textEditor: {
      enumerable: true,
      get: () => editor.textEditor
    }
  })
}

/**
 * Derived selection/tree views, replacing the old Vue computed refs. Reads are
 * plain property accesses (`store.selectedNodes`); each access recomputes from
 * the editor, and React components get change notification through editor
 * events (`useSelectionState` / `useSceneComputed`) rather than the store.
 */
export function defineEditorDerivedAccessors(store: object, editor: Editor) {
  Object.defineProperties(store, {
    selectedNodes: {
      enumerable: true,
      get: () => editor.getSelectedNodes()
    },
    selectedNode: {
      enumerable: true,
      get: () => {
        const nodes = editor.getSelectedNodes()
        return nodes.length === 1 ? nodes[0] : undefined
      }
    },
    layerTree: {
      enumerable: true,
      get: () => editor.getLayerTree()
    }
  })
}

export function createEditorStoreModules(
  editor: Editor,
  state: AppEditorState,
  io: IORegistry,
  viewportSize: ViewportSize
) {
  const flash = createFlashActions(editor, state)
  const pen = createPenActions(editor, state)
  const vectorEdit = createVectorEditActions(editor, state)
  const documentIO = createDocumentIOActions(editor, state, viewportSize)
  const documentExport = createDocumentExportActions(editor, state, io, documentIO.downloadBlob)
  const mobileClipboard = createMobileClipboardActions(editor, state)
  const profiler = createProfilerActions(editor)

  return {
    ...flash,
    ...pen,
    ...vectorEdit,
    openFigFile: documentIO.openFigFile,
    openDOMFile: documentIO.openDOMFile,
    importDOMText: documentIO.importDOMText,
    setViewportSize: documentIO.setViewportSize,
    fitCurrentPageToViewport: documentIO.fitCurrentPageToViewport,
    saveFigFile: documentIO.saveFigFile,
    saveFigFileAs: documentIO.saveFigFileAs,
    getDocumentFilePath: documentIO.getDocumentFilePath,
    getSourceIdentity: documentIO.getSourceIdentity,
    getStorageBinding: documentIO.getStorageBinding,
    setDocumentSource: documentIO.setDocumentSource,
    setStorageDocumentSource: documentIO.setStorageDocumentSource,
    setPlannedFilePath: documentIO.setPlannedFilePath,
    startWatchingCurrentFile: documentIO.startWatchingCurrentFile,
    dispose: documentIO.disposeDocumentIO,
    ...documentExport,
    ...mobileClipboard,
    ...profiler
  }
}
