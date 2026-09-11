import { omit } from 'es-toolkit/object'

import type {
  Variable,
  VariableCollection,
  VariableType,
  VariableValue
} from '@openweave/scene-graph'

import { randomHex } from '#core/random'

import type { EditorContext } from './types'

export function createVariableActions(ctx: EditorContext) {
  function getVariablesByType(type: VariableType) {
    return ctx.graph.getVariablesByType(type)
  }

  function getVariable(id: string) {
    return ctx.graph.variables.get(id)
  }

  function resolveColorVariable(id: string) {
    return ctx.graph.resolveColorVariable(id)
  }

  function resolveNumberVariable(id: string) {
    return ctx.graph.resolveNumberVariable(id)
  }

  function resolveStringVariable(id: string) {
    return ctx.graph.resolveStringVariable(id)
  }

  function resolveBooleanVariable(id: string) {
    return ctx.graph.resolveBooleanVariable(id)
  }

  // Non-color bindings are stored denormalized on the node (color fills
  // resolve live at render instead), so variable edits and mode switches must
  // push resolved values back into every bound node. Pass a variableId to
  // sync just that variable's bindings, or nothing to re-sync everything.
  function syncBoundNodeValues(variableId?: string) {
    for (const node of ctx.graph.nodes.values()) {
      for (const [field, boundId] of Object.entries(node.boundVariables)) {
        if (variableId && boundId !== variableId) continue
        // Indexed paths (fills/N/color, strokes/N/color) resolve at render.
        if (field.includes('/')) continue
        if (field === 'characters') {
          const resolved = ctx.graph.resolveStringVariableForNode(node.id, boundId)
          if (typeof resolved === 'string' && node.text !== resolved) {
            ctx.graph.updateNode(node.id, { text: resolved, styleRuns: [] })
          }
        } else if (field === 'fontFamily') {
          const resolved = ctx.graph.resolveStringVariableForNode(node.id, boundId)
          if (typeof resolved === 'string' && node.fontFamily !== resolved) {
            ctx.graph.updateNode(node.id, { fontFamily: resolved })
          }
        } else if (field === 'visible') {
          const resolved = ctx.graph.resolveBooleanVariableForNode(node.id, boundId)
          if (typeof resolved === 'boolean' && node.visible !== resolved) {
            ctx.graph.updateNode(node.id, { visible: resolved })
          }
        } else {
          const resolved = ctx.graph.resolveNumberVariableForNode(node.id, boundId)
          const current = node[field as keyof typeof node]
          if (typeof resolved === 'number' && current !== resolved) {
            ctx.graph.updateNode(node.id, { [field]: resolved })
            ctx.runLayoutForNode(node.id)
          }
        }
      }
    }
  }

  function getVariablesForCollection(collectionId: string) {
    return ctx.graph.getVariablesForCollection(collectionId)
  }

  function getCollection(id: string) {
    return ctx.graph.variableCollections.get(id)
  }

  function getCollections() {
    return [...ctx.graph.variableCollections.values()]
  }

  function getCollectionCount() {
    return ctx.graph.variableCollections.size
  }

  function getVariableCount() {
    return ctx.graph.variables.size
  }

  function renameCollection(id: string, newName: string) {
    const collection = ctx.graph.variableCollections.get(id)
    if (!collection) return
    const prevName = collection.name
    collection.name = newName
    ctx.undo.push({
      label: 'Rename collection',
      forward: () => {
        const c = ctx.graph.variableCollections.get(id)
        if (c) c.name = newName
        ctx.requestRender()
      },
      inverse: () => {
        const c = ctx.graph.variableCollections.get(id)
        if (c) c.name = prevName
        ctx.requestRender()
      }
    })
    ctx.requestRender()
  }

  function addCollection(collection: VariableCollection) {
    ctx.graph.addCollection(collection)
    ctx.undo.push({
      label: 'Add collection',
      forward: () => {
        ctx.graph.addCollection(collection)
        ctx.requestRender()
      },
      inverse: () => {
        ctx.graph.removeCollection(collection.id)
        ctx.requestRender()
      }
    })
    ctx.requestRender()
  }

  function removeCollection(id: string) {
    const collection = ctx.graph.variableCollections.get(id)
    if (!collection) return
    const snapshot = structuredClone(collection)
    const variables = snapshot.variableIds
      .map((vid) => ctx.graph.variables.get(vid))
      .filter((v): v is Variable => v != null)
      .map((v) => structuredClone(v))
    ctx.graph.removeCollection(id)
    ctx.undo.push({
      label: 'Remove collection',
      forward: () => {
        ctx.graph.removeCollection(id)
        ctx.requestRender()
      },
      inverse: () => {
        ctx.graph.addCollection(snapshot)
        for (const v of variables) ctx.graph.addVariable(v)
        ctx.requestRender()
      }
    })
    ctx.requestRender()
  }

  function addVariable(variable: Variable) {
    ctx.graph.addVariable(variable)
    ctx.undo.push({
      label: 'Add variable',
      forward: () => {
        ctx.graph.addVariable(variable)
        ctx.requestRender()
      },
      inverse: () => {
        ctx.graph.removeVariable(variable.id)
        ctx.requestRender()
      }
    })
    ctx.requestRender()
  }

  function removeVariable(id: string) {
    const variable = ctx.graph.variables.get(id)
    if (!variable) return
    const snapshot = structuredClone(variable)
    ctx.graph.removeVariable(id)
    ctx.undo.push({
      label: 'Remove variable',
      forward: () => {
        ctx.graph.removeVariable(id)
        ctx.requestRender()
      },
      inverse: () => {
        ctx.graph.addVariable(snapshot)
        ctx.requestRender()
      }
    })
    ctx.requestRender()
  }

  function renameVariable(id: string, newName: string) {
    const variable = ctx.graph.variables.get(id)
    if (!variable) return
    const prevName = variable.name
    variable.name = newName
    ctx.undo.push({
      label: 'Rename variable',
      forward: () => {
        const v = ctx.graph.variables.get(id)
        if (v) v.name = newName
        ctx.requestRender()
      },
      inverse: () => {
        const v = ctx.graph.variables.get(id)
        if (v) v.name = prevName
        ctx.requestRender()
      }
    })
    ctx.requestRender()
  }

  function addMode(collectionId: string, name?: string): string | undefined {
    const collection = ctx.graph.variableCollections.get(collectionId)
    if (!collection) return undefined
    const modeId = `mode:${randomHex(8)}`
    const modeName = name ?? `Mode ${collection.modes.length + 1}`
    ctx.graph.addMode(collectionId, modeId, modeName)
    ctx.undo.push({
      label: 'Add mode',
      forward: () => {
        ctx.graph.addMode(collectionId, modeId, modeName)
        ctx.requestRender()
      },
      inverse: () => {
        ctx.graph.removeMode(collectionId, modeId)
        ctx.requestRender()
      }
    })
    ctx.requestRender()
    return modeId
  }

  function removeMode(collectionId: string, modeId: string) {
    const collection = ctx.graph.variableCollections.get(collectionId)
    if (!collection || collection.modes.length <= 1) return
    const modeIndex = collection.modes.findIndex((m) => m.modeId === modeId)
    const modeName = collection.modes[modeIndex]?.name ?? ''
    const wasDefault = collection.defaultModeId === modeId
    const valueSnapshots = new Map<string, VariableValue>()
    for (const varId of collection.variableIds) {
      const v = ctx.graph.variables.get(varId)
      if (v?.valuesByMode[modeId] !== undefined) {
        valueSnapshots.set(varId, structuredClone(v.valuesByMode[modeId]))
      }
    }
    ctx.graph.removeMode(collectionId, modeId)
    ctx.undo.push({
      label: 'Remove mode',
      forward: () => {
        ctx.graph.removeMode(collectionId, modeId)
        ctx.requestRender()
      },
      inverse: () => {
        ctx.graph.addMode(collectionId, modeId, modeName)
        const col = ctx.graph.variableCollections.get(collectionId)
        if (col && modeIndex !== -1) {
          const mode = col.modes.pop()
          if (mode) col.modes.splice(modeIndex, 0, mode)
        }
        for (const [varId, value] of valueSnapshots) {
          const v = ctx.graph.variables.get(varId)
          if (v) v.valuesByMode[modeId] = structuredClone(value)
        }
        if (wasDefault) ctx.graph.setDefaultMode(collectionId, modeId)
        ctx.requestRender()
      }
    })
    ctx.requestRender()
  }

  function renameMode(collectionId: string, modeId: string, newName: string) {
    const collection = ctx.graph.variableCollections.get(collectionId)
    if (!collection) return
    const mode = collection.modes.find((m) => m.modeId === modeId)
    if (!mode) return
    const prevName = mode.name
    ctx.graph.renameMode(collectionId, modeId, newName)
    ctx.undo.push({
      label: 'Rename mode',
      forward: () => {
        ctx.graph.renameMode(collectionId, modeId, newName)
        ctx.requestRender()
      },
      inverse: () => {
        ctx.graph.renameMode(collectionId, modeId, prevName)
        ctx.requestRender()
      }
    })
    ctx.requestRender()
  }

  function setDefaultMode(collectionId: string, modeId: string) {
    const collection = ctx.graph.variableCollections.get(collectionId)
    if (!collection) return
    const prevDefault = collection.defaultModeId
    ctx.graph.setDefaultMode(collectionId, modeId)
    ctx.undo.push({
      label: 'Set default mode',
      forward: () => {
        ctx.graph.setDefaultMode(collectionId, modeId)
        ctx.requestRender()
      },
      inverse: () => {
        ctx.graph.setDefaultMode(collectionId, prevDefault)
        ctx.requestRender()
      }
    })
    ctx.requestRender()
  }

  function duplicateMode(collectionId: string, sourceModeId: string): string | undefined {
    const collection = ctx.graph.variableCollections.get(collectionId)
    if (!collection) return undefined
    const sourceMode = collection.modes.find((m) => m.modeId === sourceModeId)
    if (!sourceMode) return undefined
    const modeId = `mode:${randomHex(8)}`
    const modeName = `${sourceMode.name} copy`
    ctx.graph.addMode(collectionId, modeId, modeName, sourceModeId)
    ctx.undo.push({
      label: 'Duplicate mode',
      forward: () => {
        ctx.graph.addMode(collectionId, modeId, modeName, sourceModeId)
        ctx.requestRender()
      },
      inverse: () => {
        ctx.graph.removeMode(collectionId, modeId)
        ctx.requestRender()
      }
    })
    ctx.requestRender()
    return modeId
  }

  function setActiveMode(collectionId: string, modeId: string) {
    ctx.graph.setActiveMode(collectionId, modeId)
    syncBoundNodeValues()
    ctx.requestRender()
  }

  /**
   * Per-node variable mode override (Figma's frame-level "change variable
   * mode"). Pass null to clear back to Auto (inherit from ancestors / the
   * collection's active mode). Undoable; re-syncs denormalized bound values.
   */
  function setNodeVariableMode(nodeId: string, collectionId: string, modeId: string | null) {
    const node = ctx.graph.getNode(nodeId)
    if (!node) return
    const prev = { ...node.variableModes }
    const next = modeId
      ? { ...node.variableModes, [collectionId]: modeId }
      : omit(node.variableModes, [collectionId])

    const apply = (modes: Record<string, string>) => {
      if (!ctx.graph.getNode(nodeId)) return
      ctx.graph.updateNode(nodeId, { variableModes: { ...modes } })
      syncBoundNodeValues()
      ctx.requestRender()
    }
    apply(next)
    ctx.undo.push({
      label: 'Change variable mode',
      forward: () => apply(next),
      inverse: () => apply(prev)
    })
  }

  function updateVariableValue(id: string, modeId: string, value: VariableValue) {
    const variable = ctx.graph.variables.get(id)
    if (!variable) return
    const prevValue = structuredClone(variable.valuesByMode[modeId])
    const newValue = structuredClone(value)
    variable.valuesByMode[modeId] = newValue
    syncBoundNodeValues(id)
    ctx.undo.push({
      label: 'Update variable value',
      forward: () => {
        const v = ctx.graph.variables.get(id)
        if (v) {
          v.valuesByMode[modeId] = structuredClone(newValue)
          syncBoundNodeValues(id)
        }
        ctx.requestRender()
      },
      inverse: () => {
        const v = ctx.graph.variables.get(id)
        if (v) {
          v.valuesByMode[modeId] = structuredClone(prevValue)
          syncBoundNodeValues(id)
        }
        ctx.requestRender()
      }
    })
    ctx.requestRender()
  }

  return {
    getVariablesByType,
    getVariable,
    resolveColorVariable,
    resolveNumberVariable,
    resolveStringVariable,
    resolveBooleanVariable,
    getVariablesForCollection,
    getCollection,
    getCollections,
    getCollectionCount,
    getVariableCount,
    renameCollection,
    addCollection,
    removeCollection,
    addVariable,
    removeVariable,
    renameVariable,
    updateVariableValue,
    addMode,
    removeMode,
    renameMode,
    setDefaultMode,
    duplicateMode,
    setActiveMode,
    setNodeVariableMode
  }
}
