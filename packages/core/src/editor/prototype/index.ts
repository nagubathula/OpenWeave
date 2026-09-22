export { PrototypeEvaluator } from './evaluator'
export {
  extractNodeBounds,
  interpolateBounds,
  matchLayers,
  PROTOTYPE_EASING_CSS,
  FIGMA_SPRING_PRESETS,
  solveSpringDisplacement,
  getSpringSettlingDuration,
  springToCubicBezier,
  getSpringCssEasing
} from './smart-animate'
export type { LayerMatch, MatchedNodeBounds, SmartAnimatePlan } from './smart-animate'
export {
  DEVICE_SPECS,
  DEVICE_PRESET_OPTIONS,
  resolveDeviceSpec,
  computeDeviceOuterBounds
} from './device'
export type { DevicePresetId, DeviceCutoutType, DeviceSpec } from './device'
