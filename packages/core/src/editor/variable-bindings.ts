import type { SceneNode } from '@openweave/scene-graph'
import { copyStyleRuns } from '@openweave/scene-graph/copy'

import { reapplyInstanceComponentProperties } from './components/properties'
import type { EditorContext } from './types'

export function createVariableBindingActions(ctx: EditorContext) {
  // Direct (non-indexed) bindings are denormalized onto the node, so binding
  // applies the variable's resolved value immediately. Indexed color paths
  // (fills/N/color) resolve live at render and need no node write.
  function resolvedChanges(nodeId: string, field: string): Partial<SceneNode> | null {
    if (field.includes('/') && !field.startsWith('componentPropertyAssignments:')) return null
    const node = ctx.graph.getNode(nodeId)
    const variableId = node?.boundVariables[field]
    if (!node || !variableId) return null
    if (field.startsWith('componentPropertyAssignments:')) {
      const propId = field.split(':')[1]
      const variable = ctx.graph.variables.get(variableId)
      if (!variable) return null

      let resolvedValue: string | boolean | number | null = null
      if (variable.type === 'STRING')
        resolvedValue = ctx.graph.resolveStringVariableForNode(nodeId, variableId) ?? null
      else if (variable.type === 'BOOLEAN')
        resolvedValue = ctx.graph.resolveBooleanVariableForNode(nodeId, variableId) ?? null

      if (resolvedValue !== null) {
        const strValue = String(resolvedValue)
        if (node.componentPropertyAssignments?.[propId] !== strValue) {
          return {
            componentPropertyAssignments: {
              ...node.componentPropertyAssignments,
              [propId]: strValue
            }
          }
        }
      }
      return null
    }
    if (field === 'characters') {
      const resolved = ctx.graph.resolveStringVariableForNode(nodeId, variableId)
      return typeof resolved === 'string' && node.text !== resolved
        ? { text: resolved, styleRuns: [] }
        : null
    }
    if (field === 'fontFamily') {
      const resolved = ctx.graph.resolveStringVariableForNode(nodeId, variableId)
      return typeof resolved === 'string' && node.fontFamily !== resolved
        ? { fontFamily: resolved }
        : null
    }
    if (field === 'visible') {
      const resolved = ctx.graph.resolveBooleanVariableForNode(nodeId, variableId)
      return typeof resolved === 'boolean' && node.visible !== resolved
        ? { visible: resolved }
        : null
    }
    const resolved = ctx.graph.resolveNumberVariableForNode(nodeId, variableId)
    const current = node[field as keyof SceneNode]
    return typeof resolved === 'number' && current !== resolved ? { [field]: resolved } : null
  }

  function applyBoundValue(nodeId: string, field: string) {
    const changes = resolvedChanges(nodeId, field)
    if (!changes) return
    ctx.graph.updateNode(nodeId, changes)
    if (field.startsWith('componentPropertyAssignments:')) {
      reapplyInstanceComponentProperties(ctx, nodeId)
    }
    ctx.runLayoutForNode(nodeId)
  }

  function capturePreviousValue(node: SceneNode, field: string): Partial<SceneNode> | null {
    if (field.includes('/') && !field.startsWith('componentPropertyAssignments:')) return null
    if (field.startsWith('componentPropertyAssignments:'))
      return { componentPropertyAssignments: { ...node.componentPropertyAssignments } }
    if (field === 'characters') return { text: node.text, styleRuns: copyStyleRuns(node.styleRuns) }
    if (field === 'fontFamily') return { fontFamily: node.fontFamily }
    if (field === 'visible') return { visible: node.visible }
    return { [field]: node[field as keyof SceneNode] } as Partial<SceneNode>
  }

  function bindVariable(nodeId: string, path: string, variableId: string) {
    const node = ctx.graph.getNode(nodeId)
    if (!node) return
    const prevVarId = node.boundVariables[path]
    const prevValue = capturePreviousValue(node, path)
    ctx.graph.bindVariable(nodeId, path, variableId)
    applyBoundValue(nodeId, path)
    ctx.undo.push({
      label: 'Bind variable',
      forward: () => {
        try {
          ctx.graph.bindVariable(nodeId, path, variableId)
          applyBoundValue(nodeId, path)
          ctx.requestRender()
        } catch (e) {
          console.warn('Redo bindVariable failed:', e instanceof Error ? e.message : String(e))
        }
      },
      inverse: () => {
        try {
          if (prevVarId) ctx.graph.bindVariable(nodeId, path, prevVarId)
          else ctx.graph.unbindVariable(nodeId, path)
          if (prevValue && ctx.graph.getNode(nodeId)) {
            ctx.graph.updateNode(nodeId, prevValue)
            ctx.runLayoutForNode(nodeId)
          }
          ctx.requestRender()
        } catch (e) {
          console.warn('Undo bindVariable failed:', e instanceof Error ? e.message : String(e))
        }
      }
    })
    ctx.requestRender()
  }

  function unbindVariable(nodeId: string, path: string) {
    const node = ctx.graph.getNode(nodeId)
    if (!node) return
    const prevVarId = node.boundVariables[path]
    if (!prevVarId) return
    ctx.graph.unbindVariable(nodeId, path)
    ctx.undo.push({
      label: 'Unbind variable',
      forward: () => {
        try {
          ctx.graph.unbindVariable(nodeId, path)
          ctx.requestRender()
        } catch (e) {
          console.warn('Redo unbindVariable failed:', e instanceof Error ? e.message : String(e))
        }
      },
      inverse: () => {
        try {
          ctx.graph.bindVariable(nodeId, path, prevVarId)
          ctx.requestRender()
        } catch (e) {
          console.warn('Undo unbindVariable failed:', e instanceof Error ? e.message : String(e))
        }
      }
    })
    ctx.requestRender()
  }

  return { bindVariable, unbindVariable }
}
