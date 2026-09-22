export { createDefaultEditorState, createEditor } from './create'
export type { Editor } from './create'
export { createStyleActions } from './styles'
export type { SharedStyleUpdatePatch, SharedStyleTypographyPatch } from './styles'
export { createTextActions } from './text'
export { opacityFromBuffer } from './nodes'
export { EDITOR_TOOLS, TOOL_SHORTCUTS } from './tool-registry'
export type { RenameSelectionOptions, RenameSelectionPreview } from './structure/rename'
export type { EditorToolDef } from './tool-registry'
export type {
  ClipboardImageResolution,
  EditorContext,
  EditorEventName,
  EditorEvents,
  EditorOptions,
  EditorState,
  FigmaClipboardImageResolver,
  Tool
} from './types'
export {
  PrototypeEvaluator,
  extractNodeBounds,
  interpolateBounds,
  matchLayers,
  PROTOTYPE_EASING_CSS,
  FIGMA_SPRING_PRESETS,
  solveSpringDisplacement,
  getSpringSettlingDuration,
  springToCubicBezier,
  getSpringCssEasing
} from './prototype'
export type { LayerMatch, MatchedNodeBounds, SmartAnimatePlan } from './prototype'
