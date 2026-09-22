import { colorToCSS, colorToHex } from '@openweave/core/color'
import type { SceneGraph, SceneNode } from '@openweave/scene-graph'

function getBoundTokenVar(node: SceneNode, field: string, graph: SceneGraph): string | null {
  const varId = node.boundVariables[field]
  if (!varId) return null
  const v = graph.variables.get(varId)
  if (!v) return null
  const sanitized = v.name.replace(/[/\s_]+/g, '-').toLowerCase()
  return `var(--${sanitized})`
}

export function generateNodeCSS(node: SceneNode, graph: SceneGraph): string {
  const rules: string[] = []
  const className =
    node.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || 'layer'

  // Dimensions & Positioning
  const widthToken = getBoundTokenVar(node, 'width', graph)
  const heightToken = getBoundTokenVar(node, 'height', graph)

  if (
    node.primaryAxisSizing === 'FILL' &&
    (node.layoutMode === 'HORIZONTAL' || node.layoutMode === 'VERTICAL')
  ) {
    rules.push('  width: 100%;')
  } else {
    rules.push(`  width: ${widthToken ?? `${Math.round(node.width)}px`};`)
  }

  if (
    node.counterAxisSizing === 'FILL' &&
    (node.layoutMode === 'HORIZONTAL' || node.layoutMode === 'VERTICAL')
  ) {
    rules.push('  height: 100%;')
  } else {
    rules.push(`  height: ${heightToken ?? `${Math.round(node.height)}px`};`)
  }

  if (node.minWidth != null) rules.push(`  min-width: ${Math.round(node.minWidth)}px;`)
  if (node.maxWidth != null) rules.push(`  max-width: ${Math.round(node.maxWidth)}px;`)
  if (node.minHeight != null) rules.push(`  min-height: ${Math.round(node.minHeight)}px;`)
  if (node.maxHeight != null) rules.push(`  max-height: ${Math.round(node.maxHeight)}px;`)

  // Auto-layout / Flexbox
  if (node.layoutMode === 'HORIZONTAL' || node.layoutMode === 'VERTICAL') {
    rules.push('  display: flex;')
    rules.push(`  flex-direction: ${node.layoutMode === 'HORIZONTAL' ? 'row' : 'column'};`)

    if (node.layoutWrap === 'WRAP') {
      rules.push('  flex-wrap: wrap;')
    }

    const alignMap: Record<string, string> = {
      CENTER: 'center',
      MAX: 'flex-end',
      STRETCH: 'stretch',
      MIN: 'flex-start'
    }
    const justifyMap: Record<string, string> = {
      CENTER: 'center',
      MAX: 'flex-end',
      SPACE_BETWEEN: 'space-between',
      MIN: 'flex-start'
    }

    if (node.counterAxisAlign && alignMap[node.counterAxisAlign]) {
      rules.push(`  align-items: ${alignMap[node.counterAxisAlign]};`)
    }
    if (node.primaryAxisAlign && justifyMap[node.primaryAxisAlign]) {
      rules.push(`  justify-content: ${justifyMap[node.primaryAxisAlign]};`)
    }

    if (node.itemSpacing > 0) {
      const gapToken = getBoundTokenVar(node, 'itemSpacing', graph)
      rules.push(`  gap: ${gapToken ?? `${Math.round(node.itemSpacing)}px`};`)
    }

    const { paddingTop: pt, paddingRight: pr, paddingBottom: pb, paddingLeft: pl } = node
    if (pt > 0 || pr > 0 || pb > 0 || pl > 0) {
      const pToken = getBoundTokenVar(node, 'paddingTop', graph)
      if (pToken) {
        rules.push(`  padding: ${pToken};`)
      } else if (pt === pr && pr === pb && pb === pl) {
        rules.push(`  padding: ${Math.round(pt)}px;`)
      } else if (pt === pb && pl === pr) {
        rules.push(`  padding: ${Math.round(pt)}px ${Math.round(pl)}px;`)
      } else {
        rules.push(
          `  padding: ${Math.round(pt)}px ${Math.round(pr)}px ${Math.round(pb)}px ${Math.round(pl)}px;`
        )
      }
    }
  }

  if (node.layoutGrow > 0) {
    rules.push(`  flex-grow: ${node.layoutGrow};`)
  }

  // Fills & Background
  if (node.fills && node.fills.length > 0) {
    const visibleFill = node.fills.find((f) => f.visible !== false)
    if (visibleFill && visibleFill.type === 'SOLID') {
      const fillToken = getBoundTokenVar(node, 'fills/0/color', graph)
      const colorVal = fillToken ?? colorToCSS(visibleFill.color)
      rules.push(`  background: ${colorVal};`)
    }
  }

  // Strokes & Border
  if (node.strokes && node.strokes.length > 0) {
    const stroke = node.strokes.find((s) => s.visible !== false && s.weight > 0)
    if (stroke) {
      const strokeToken = getBoundTokenVar(node, 'strokes/0/color', graph)
      const strokeColor = strokeToken ?? colorToHex(stroke.color)
      const weight = Math.round(stroke.weight)
      rules.push(`  border: ${weight}px solid ${strokeColor};`)
    }
  }

  // Corner Radius
  if (node.independentCorners) {
    rules.push(
      `  border-radius: ${Math.round(node.topLeftRadius)}px ${Math.round(node.topRightRadius)}px ${Math.round(node.bottomRightRadius)}px ${Math.round(node.bottomLeftRadius)}px;`
    )
  } else if (node.cornerRadius > 0) {
    const radiusToken = getBoundTokenVar(node, 'cornerRadius', graph)
    const radius = node.cornerRadius >= 9999 ? '9999px' : `${Math.round(node.cornerRadius)}px`
    rules.push(`  border-radius: ${radiusToken ?? radius};`)
  }

  // Effects & Shadows
  if (node.effects && node.effects.length > 0) {
    const shadowEffects = node.effects.filter(
      (e) => (e.type === 'DROP_SHADOW' || e.type === 'INNER_SHADOW') && e.visible !== false
    )
    if (shadowEffects.length > 0) {
      const shadows = shadowEffects.map((e) => {
        const inset = e.type === 'INNER_SHADOW' ? 'inset ' : ''
        const x = Math.round(e.offset?.x ?? 0)
        const y = Math.round(e.offset?.y ?? 0)
        const blur = Math.round(e.radius ?? 0)
        const spread = Math.round(e.spread ?? 0)
        const c = e.color ? colorToCSS(e.color) : 'rgba(0, 0, 0, 0.25)'
        return `${inset}${x}px ${y}px ${blur}px ${spread}px ${c}`
      })
      rules.push(`  box-shadow: ${shadows.join(', ')};`)
    }
  }

  // Typography
  if (node.type === 'TEXT') {
    rules.push(`  font-family: '${node.fontFamily}', sans-serif;`)
    rules.push(`  font-size: ${Math.round(node.fontSize)}px;`)
    rules.push(`  font-weight: ${node.fontWeight};`)
    if (node.lineHeight != null && node.lineHeight > 0) {
      rules.push(`  line-height: ${Math.round(node.lineHeight)}px;`)
    }
    if (node.textAlignHorizontal) {
      const align = node.textAlignHorizontal.toLowerCase()
      rules.push(`  text-align: ${align};`)
    }
    if (node.fills && node.fills.length > 0) {
      const textFill = node.fills.find((f) => f.visible !== false)
      if (textFill && textFill.type === 'SOLID') {
        const textToken = getBoundTokenVar(node, 'fills/0/color', graph)
        rules.push(`  color: ${textToken ?? colorToCSS(textFill.color)};`)
      }
    }
  }

  // Opacity
  if (node.opacity < 1) {
    rules.push(`  opacity: ${Number(node.opacity.toFixed(2))};`)
  }

  return `/* ${node.name} (${node.type}) */\n.${className} {\n${rules.join('\n')}\n}`
}
