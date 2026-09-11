import type {
  PrototypeEasing,
  SceneGraph,
  SpringConfig,
  SpringPreset,
  Vector
} from '@openweave/scene-graph'

export interface MatchedNodeBounds {
  id: string
  name: string
  type: string
  x: number
  y: number
  width: number
  height: number
  opacity: number
  rotation: number
  cornerRadius: number
}

export interface LayerMatch {
  source: MatchedNodeBounds
  destination: MatchedNodeBounds
}

export interface SmartAnimatePlan {
  matches: LayerMatch[]
  sourceOnly: MatchedNodeBounds[]
  destinationOnly: MatchedNodeBounds[]
}

export const PROTOTYPE_EASING_CSS: Record<PrototypeEasing, string> = {
  LINEAR: 'linear',
  EASE_IN: 'cubic-bezier(0.4, 0, 1, 1)',
  EASE_OUT: 'cubic-bezier(0, 0, 0.2, 1)',
  EASE_IN_AND_OUT: 'cubic-bezier(0.4, 0, 0.2, 1)',
  SPRING: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)', // Figma-like bouncy spring curve
  CUSTOM_CUBIC: 'cubic-bezier(0.25, 0.1, 0.25, 1)'
}

export const FIGMA_SPRING_PRESETS: Record<Exclude<SpringPreset, 'CUSTOM'>, SpringConfig> = {
  GENTLE: { mass: 1, stiffness: 100, damping: 15 },
  QUICK: { mass: 1, stiffness: 300, damping: 20 },
  BOUNCY: { mass: 1, stiffness: 600, damping: 15 },
  SLOW: { mass: 1, stiffness: 80, damping: 20 }
}

/**
 * Numerically solves a second-order spring-damper displacement y(t) at time t in seconds,
 * starting from y(0)=0 and settling at y=1.
 */
export function solveSpringDisplacement(config: SpringConfig, t: number): number {
  const m = Math.max(0.001, config.mass)
  const k = Math.max(1, config.stiffness)
  const c = Math.max(0, config.damping)

  const omega0 = Math.sqrt(k / m)
  const zeta = c / (2 * Math.sqrt(k * m))

  if (t <= 0) return 0

  if (zeta < 1) {
    // Underdamped (oscillatory / bouncy)
    const omegaD = omega0 * Math.sqrt(1 - zeta * zeta)
    const envelope = Math.exp(-zeta * omega0 * t)
    return (
      1 -
      envelope * (Math.cos(omegaD * t) + (zeta / Math.sqrt(1 - zeta * zeta)) * Math.sin(omegaD * t))
    )
  }
  if (Math.abs(zeta - 1) < 1e-4) {
    // Critically damped
    return 1 - Math.exp(-omega0 * t) * (1 + omega0 * t)
  }
  // Overdamped
  const s = Math.sqrt(zeta * zeta - 1)
  const r1 = -omega0 * (zeta - s)
  const r2 = -omega0 * (zeta + s)
  return 1 - (r2 * Math.exp(r1 * t) - r1 * Math.exp(r2 * t)) / (r2 - r1)
}

/**
 * Approximates settling duration in milliseconds (within ~2% of target).
 */
export function getSpringSettlingDuration(config: SpringConfig): number {
  const m = Math.max(0.001, config.mass)
  const k = Math.max(1, config.stiffness)
  const c = Math.max(0.001, config.damping)
  const omega0 = Math.sqrt(k / m)
  const zeta = c / (2 * Math.sqrt(k * m))

  const decayRate = Math.max(1, zeta * omega0)
  const durationSec = Math.max(0.2, Math.min(2.0, 4.0 / decayRate))
  return Math.round(durationSec * 1000)
}

/**
 * Approximates a CSS cubic-bezier string for a given SpringConfig.
 */
export function springToCubicBezier(config: SpringConfig): string {
  const m = Math.max(0.001, config.mass)
  const k = Math.max(1, config.stiffness)
  const c = Math.max(0.001, config.damping)
  const zeta = c / (2 * Math.sqrt(k * m))

  if (zeta < 0.35) {
    return 'cubic-bezier(0.175, 0.885, 0.32, 1.275)'
  }
  if (zeta < 0.65) {
    return 'cubic-bezier(0.2, 0.9, 0.2, 1.12)'
  }
  if (zeta < 0.95) {
    return 'cubic-bezier(0.16, 1, 0.3, 1.05)'
  }
  return 'cubic-bezier(0.25, 1, 0.5, 1)'
}

/**
 * Resolves the CSS easing curve based on preset or custom spring config.
 */
export function getSpringCssEasing(preset?: SpringPreset, customConfig?: SpringConfig): string {
  if (preset === 'CUSTOM' && customConfig) {
    return springToCubicBezier(customConfig)
  }
  if (preset && preset in FIGMA_SPRING_PRESETS) {
    const config = FIGMA_SPRING_PRESETS[preset as keyof typeof FIGMA_SPRING_PRESETS]
    return springToCubicBezier(config)
  }
  return PROTOTYPE_EASING_CSS.SPRING
}

export function extractNodeBounds(
  graph: SceneGraph,
  nodeId: string,
  frameOrigin: Vector
): MatchedNodeBounds | null {
  const node = graph.getNode(nodeId)
  if (!node || !node.visible) return null

  const abs = graph.getAbsolutePosition(nodeId)
  return {
    id: node.id,
    name: node.name,
    type: node.type,
    x: abs.x - frameOrigin.x,
    y: abs.y - frameOrigin.y,
    width: node.width,
    height: node.height,
    opacity: node.opacity ?? 1,
    rotation: node.rotation ?? 0,
    cornerRadius: node.cornerRadius ?? 0
  }
}

export function matchLayers(
  graph: SceneGraph,
  sourceFrameId: string,
  destFrameId: string
): SmartAnimatePlan {
  const sourceFrame = graph.getNode(sourceFrameId)
  const destFrame = graph.getNode(destFrameId)

  if (!sourceFrame || !destFrame) {
    return { matches: [], sourceOnly: [], destinationOnly: [] }
  }

  const sourceOrigin = graph.getAbsolutePosition(sourceFrameId)
  const destOrigin = graph.getAbsolutePosition(destFrameId)

  // Collect all descendants for source frame
  const sourceNodes: MatchedNodeBounds[] = []
  const collectDescendants = (parentId: string, origin: Vector, list: MatchedNodeBounds[]) => {
    const parent = graph.getNode(parentId)
    if (!parent) return
    for (const childId of parent.childIds) {
      const bounds = extractNodeBounds(graph, childId, origin)
      if (bounds) {
        list.push(bounds)
        collectDescendants(childId, origin, list)
      }
    }
  }

  collectDescendants(sourceFrameId, sourceOrigin, sourceNodes)

  // Collect all descendants for dest frame
  const destNodes: MatchedNodeBounds[] = []
  collectDescendants(destFrameId, destOrigin, destNodes)

  const matches: LayerMatch[] = []
  const matchedDestIds = new Set<string>()
  const matchedSourceIds = new Set<string>()

  // 1. Match by exact ID (e.g. interactive components or variant state within same instance)
  for (const src of sourceNodes) {
    const dest = destNodes.find((d) => d.id === src.id && !matchedDestIds.has(d.id))
    if (dest) {
      matches.push({ source: src, destination: dest })
      matchedSourceIds.add(src.id)
      matchedDestIds.add(dest.id)
    }
  }

  // 2. Match by exact Name & Type
  for (const src of sourceNodes) {
    if (matchedSourceIds.has(src.id)) continue
    const dest = destNodes.find(
      (d) => d.name === src.name && d.type === src.type && !matchedDestIds.has(d.id)
    )
    if (dest) {
      matches.push({ source: src, destination: dest })
      matchedSourceIds.add(src.id)
      matchedDestIds.add(dest.id)
    }
  }

  const sourceOnly = sourceNodes.filter((s) => !matchedSourceIds.has(s.id))
  const destinationOnly = destNodes.filter((d) => !matchedDestIds.has(d.id))

  return { matches, sourceOnly, destinationOnly }
}

export function interpolateBounds(
  source: MatchedNodeBounds,
  dest: MatchedNodeBounds,
  progress: number
): MatchedNodeBounds {
  const p = Math.max(0, Math.min(1, progress))
  return {
    id: dest.id,
    name: dest.name,
    type: dest.type,
    x: source.x + (dest.x - source.x) * p,
    y: source.y + (dest.y - source.y) * p,
    width: source.width + (dest.width - source.width) * p,
    height: source.height + (dest.height - source.height) * p,
    opacity: source.opacity + (dest.opacity - source.opacity) * p,
    rotation: source.rotation + (dest.rotation - source.rotation) * p,
    cornerRadius: source.cornerRadius + (dest.cornerRadius - source.cornerRadius) * p
  }
}
