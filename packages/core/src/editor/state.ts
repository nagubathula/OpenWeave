import { CANVAS_BG_COLOR } from '#core/constants'
import type { EditorState } from '#core/editor/types'

export function createDefaultEditorState(pageId: string): EditorState {
  return {
    activeTool: 'SELECT',
    currentPageId: pageId,
    selectedIds: new Set<string>(),
    marquee: null,
    snapGuides: [],
    rotationPreview: null,
    dropTargetId: null,
    layoutInsertIndicator: null,
    hoveredNodeId: null,
    altHeld: false,
    activeGuide: null,
    editingTextId: null,
    penState: null,
    penCursorX: null,
    penCursorY: null,
    remoteCursors: [],
    autoLayoutHover: null,
    cornerRadiusHover: null,
    cornerRadiusDrag: null,
    documentName: 'Untitled',
    panX: 0,
    pageColor: { ...CANVAS_BG_COLOR },
    panY: 0,
    zoom: 1,
    renderVersion: 0,
    sceneVersion: 0,
    loading: false,
    enteredContainerId: null,
    prototypeMode: false,
    devMode: false,
    prototypeDrag: null,
    copiedProperties: null,
    cropState: null
  }
}
