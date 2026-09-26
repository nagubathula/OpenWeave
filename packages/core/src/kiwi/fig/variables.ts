import {
  fractionalPosition,
  guidToString,
  resolveVariableConsumptionEntry,
  safeColor
} from '@openweave/fig/node-change'
import type { Color, GUID, NodeChange, VariableDataValuesEntry } from '@openweave/kiwi/fig/codec'
import { stringToGuid } from '@openweave/kiwi/fig/guid'
import type {
  SceneGraph,
  VariableCollection,
  VariableType,
  VariableValue
} from '@openweave/scene-graph'

import { BLACK } from '#core/constants'

export type AssetRef = { key: string; version?: string }
export type AliasRef = { guid?: GUID; assetRef?: AssetRef }

export function assetRefKey(assetRef: AssetRef): string {
  return assetRef.version ? `${assetRef.key}@${assetRef.version}` : assetRef.key
}

export function buildAssetRefMap(changeMap: Map<string, NodeChange>): Map<string, string> {
  const refs = new Map<string, string>()
  for (const [id, nc] of changeMap) {
    if (typeof nc.key !== 'string') continue
    refs.set(nc.key, id)
    if (typeof nc.version === 'string')
      refs.set(assetRefKey({ key: nc.key, version: nc.version }), id)
    if (typeof nc.userFacingVersion === 'string') {
      refs.set(assetRefKey({ key: nc.key, version: nc.userFacingVersion }), id)
    }
  }
  return refs
}

export function resolveAliasId(
  alias: AliasRef,
  assetRefs: Map<string, string>
): string | undefined {
  if (alias.guid) return guidToString(alias.guid)
  if (!alias.assetRef) return undefined
  return assetRefs.get(assetRefKey(alias.assetRef)) ?? assetRefs.get(alias.assetRef.key)
}

export function buildVariableColorResolver(
  changeMap: Map<string, NodeChange>,
  assetRefs: Map<string, string>
): (alias: AliasRef) => Color | null {
  // Collect variable data: GUID → entries
  const varEntries = new Map<string, VariableDataValuesEntry[]>()
  const varSetId = new Map<string, string>()
  for (const [id, nc] of changeMap) {
    if (nc.type !== 'VARIABLE') continue
    varEntries.set(id, nc.variableDataValues?.entries ?? [])
    const setGuid = nc.variableSetID?.guid ? guidToString(nc.variableSetID.guid) : undefined
    const parentGuid = nc.parentIndex?.guid ? guidToString(nc.parentIndex.guid) : undefined
    if (setGuid) varSetId.set(id, setGuid)
    else if (parentGuid) varSetId.set(id, parentGuid)
  }

  // Collection default modes
  const defaultModes = new Map<string, string>()
  for (const [id, nc] of changeMap) {
    if (nc.type !== 'VARIABLE_SET') continue
    const modes = nc.variableSetModes ?? []
    if (modes.length > 0) defaultModes.set(id, guidToString(modes[0].id))
  }

  function resolveById(
    id: string,
    preferredModeId: string | undefined,
    depth: number
  ): Color | null {
    if (depth > 10) return null
    const entries = varEntries.get(id)
    if (!entries?.length) return null

    const setId = varSetId.get(id)
    const defaultMode = setId ? defaultModes.get(setId) : undefined
    let entry = preferredModeId
      ? entries.find((e) => guidToString(e.modeID) === preferredModeId)
      : undefined
    if (!entry && defaultMode) entry = entries.find((e) => guidToString(e.modeID) === defaultMode)
    if (!entry) entry = entries[0]

    const val = entry.variableData?.value
    if (!val) return null
    if (val.colorValue) return val.colorValue
    if (val.alias) {
      const aliasId = resolveAliasId(val.alias, assetRefs)
      if (aliasId) return resolveById(aliasId, guidToString(entry.modeID), depth + 1)
    }
    return null
  }

  return function resolve(alias: AliasRef): Color | null {
    const id = resolveAliasId(alias, assetRefs)
    return id ? resolveById(id, undefined, 0) : null
  }
}

export function resolveVariableType(resolvedType: string | undefined): VariableType {
  if (resolvedType === 'COLOR') return 'COLOR'
  if (resolvedType === 'BOOLEAN') return 'BOOLEAN'
  if (resolvedType === 'STRING') return 'STRING'
  return 'FLOAT'
}

export function resolveVariableValue(
  entry: VariableDataValuesEntry,
  assetRefs: Map<string, string>
): VariableValue | undefined {
  const vd = entry.variableData
  if (!vd.value) return undefined

  const dt = vd.dataType ?? vd.resolvedDataType
  if (dt === 'COLOR' && vd.value.colorValue) {
    const c = vd.value.colorValue
    return { r: c.r, g: c.g, b: c.b, a: c.a }
  }
  if (dt === 'BOOLEAN') return vd.value.boolValue ?? false
  if (dt === 'STRING') return vd.value.textValue ?? ''
  if (dt === 'ALIAS' && vd.value.alias) {
    const aliasId = resolveAliasId(vd.value.alias, assetRefs)
    if (aliasId) return { aliasId }
    return undefined
  }
  return vd.value.floatValue ?? 0
}

export function resolveDefaultValue(type: VariableType): VariableValue {
  if (type === 'BOOLEAN') return false
  if (type === 'STRING') return ''
  if (type === 'COLOR') return { ...BLACK }
  return 0
}

export function importCollections(changeMap: Map<string, NodeChange>, graph: SceneGraph): void {
  for (const [id, nc] of changeMap) {
    if (nc.type !== 'VARIABLE_SET') continue

    const modes = (nc.variableSetModes ?? []).map((m) => {
      const modeId = guidToString(m.id)
      return { modeId, name: m.name }
    })
    if (modes.length === 0) modes.push({ modeId: 'default', name: 'Default' })

    const existing = graph.variableCollections.get(id)
    if (existing) {
      for (const mode of modes) {
        if (!existing.modes.some((m) => m.modeId === mode.modeId)) {
          existing.modes.push(mode)
        }
      }
    } else {
      graph.addCollection({
        id,
        name: nc.name ?? 'Variables',
        modes,
        defaultModeId: modes[0].modeId,
        variableIds: []
      })
    }
  }
}

export function resolveVariableCollectionId(
  nc: NodeChange,
  id: string,
  parentMap: Map<string, string>,
  assetRefs: Map<string, string>
): string {
  if (nc.variableSetID?.guid) return guidToString(nc.variableSetID.guid)
  const assetRef = nc.variableSetID?.assetRef
  if (assetRef) return assetRefs.get(assetRefKey(assetRef)) ?? assetRefs.get(assetRef.key) ?? ''
  return parentMap.get(id) ?? ''
}

export function addFallbackCollection(
  changeMap: Map<string, NodeChange>,
  graph: SceneGraph,
  collectionId: string
): void {
  if (graph.variableCollections.has(collectionId)) return
  const parentNc = changeMap.get(collectionId)
  graph.addCollection({
    id: collectionId,
    name: parentNc?.name ?? 'Variables',
    modes: [{ modeId: 'default', name: 'Default' }],
    defaultModeId: 'default',
    variableIds: []
  })
}

export function importVariableEntries(
  changeMap: Map<string, NodeChange>,
  parentMap: Map<string, string>,
  graph: SceneGraph,
  assetRefs: Map<string, string>
): void {
  for (const [id, nc] of changeMap) {
    if (nc.type !== 'VARIABLE') continue

    const rawCollectionId = resolveVariableCollectionId(nc, id, parentMap, assetRefs)
    const collectionId = rawCollectionId || 'default-collection'
    addFallbackCollection(changeMap, graph, collectionId)

    const type = resolveVariableType(nc.variableResolvedType)
    const valuesByMode: Record<string, VariableValue> = {}

    if (nc.variableDataValues?.entries) {
      for (const entry of nc.variableDataValues.entries) {
        const val = resolveVariableValue(entry, assetRefs)
        if (val !== undefined) {
          valuesByMode[guidToString(entry.modeID)] = val
        }
      }
    }

    if (Object.keys(valuesByMode).length === 0) {
      const col = graph.variableCollections.get(collectionId)
      const defaultMode = col?.defaultModeId ?? 'default'
      valuesByMode[defaultMode] = resolveDefaultValue(type)
    }

    graph.addVariable({
      id,
      name: nc.name ?? 'Variable',
      type,
      collectionId,
      valuesByMode,
      description: '',
      hiddenFromPublishing: false,
      key: typeof nc.key === 'string' ? nc.key : undefined,
      version: typeof nc.version === 'string' ? nc.version : undefined
    })
  }
}

export function importVariableBindings(
  changeMap: Map<string, NodeChange>,
  guidToNodeId: Map<string, string>,
  graph: SceneGraph
): void {
  for (const [ncId, nc] of changeMap) {
    if (!nc.variableConsumptionMap?.entries?.length) continue
    const nodeId = guidToNodeId.get(ncId)
    if (!nodeId) continue
    const node = graph.getNode(nodeId)
    if (!node) continue
    for (const entry of nc.variableConsumptionMap.entries) {
      const binding = resolveVariableConsumptionEntry(entry)
      if (binding) {
        node.boundVariables[binding.field] = binding.variableId
      }
    }
  }
}

export function assignVariableGuid(
  id: string,
  localIdCounter: { value: number },
  assignedGuidValues: Set<string>,
  nodeSourceGuidValues: Set<string>
): GUID {
  if (/^\d+:\d+$/.test(id) && !assignedGuidValues.has(id) && !nodeSourceGuidValues.has(id)) {
    const guid = stringToGuid(id)
    assignedGuidValues.add(id)
    return guid
  }
  const guid = { sessionID: 0, localID: localIdCounter.value++ }
  assignedGuidValues.add(`${guid.sessionID}:${guid.localID}`)
  return guid
}

export function assignVariableGuids(
  graph: SceneGraph,
  localIdCounter: { value: number },
  varIdToGuid: Map<string, GUID>,
  modeIdToGuid: Map<string, GUID>,
  assignedGuidValues: Set<string>,
  nodeSourceGuidValues: Set<string>,
  collections?: Iterable<VariableCollection>
): void {
  const cols = collections ?? graph.variableCollections.values()
  for (const col of cols) {
    const colGuid = assignVariableGuid(
      col.id,
      localIdCounter,
      assignedGuidValues,
      nodeSourceGuidValues
    )
    varIdToGuid.set(col.id, colGuid)
    for (const mode of col.modes) {
      const modeGuid = assignVariableGuid(
        mode.modeId,
        localIdCounter,
        assignedGuidValues,
        nodeSourceGuidValues
      )
      modeIdToGuid.set(mode.modeId, modeGuid)
    }
    for (const varId of col.variableIds) {
      const varGuid = assignVariableGuid(
        varId,
        localIdCounter,
        assignedGuidValues,
        nodeSourceGuidValues
      )
      varIdToGuid.set(varId, varGuid)
    }
  }
}

export function variableValueToKiwi(
  value: VariableValue,
  type: string,
  varIdToGuid: Map<string, GUID>
): { value: Record<string, unknown>; dataType: string; resolvedDataType: string } {
  if (value && typeof value === 'object' && 'aliasId' in value) {
    const aliasGuid = varIdToGuid.get(value.aliasId) ?? stringToGuid(value.aliasId)
    return {
      value: { alias: { guid: aliasGuid } },
      dataType: 'ALIAS',
      resolvedDataType: { COLOR: 'COLOR', BOOLEAN: 'BOOLEAN', STRING: 'STRING' }[type] ?? 'FLOAT'
    }
  }
  if (type === 'COLOR' && typeof value === 'object' && 'r' in value) {
    return {
      value: { colorValue: safeColor(value) },
      dataType: 'COLOR',
      resolvedDataType: 'COLOR'
    }
  }
  if (type === 'BOOLEAN') {
    return { value: { boolValue: !!value }, dataType: 'BOOLEAN', resolvedDataType: 'BOOLEAN' }
  }
  if (type === 'STRING') {
    return {
      value: { textValue: typeof value === 'string' ? value : JSON.stringify(value) },
      dataType: 'STRING',
      resolvedDataType: 'STRING'
    }
  }
  return { value: { floatValue: Number(value) }, dataType: 'FLOAT', resolvedDataType: 'FLOAT' }
}

export function appendVariableNodeChanges(
  graph: SceneGraph,
  nodeChanges: NodeChange[],
  internalCanvasGuid: GUID,
  varIdToGuid: Map<string, GUID>,
  modeIdToGuid: Map<string, GUID>,
  collections?: Iterable<VariableCollection>
): void {
  let collIdx = 0
  const cols = collections ?? graph.variableCollections.values()
  for (const col of cols) {
    const colGuid = varIdToGuid.get(col.id) ?? stringToGuid(col.id)
    nodeChanges.push({
      guid: colGuid,
      parentIndex: { guid: internalCanvasGuid, position: fractionalPosition(collIdx++) },
      type: 'VARIABLE_SET',
      name: col.name,
      phase: 'CREATED',
      strokeAlign: 'CENTER',
      strokeJoin: 'BEVEL',
      variableSetModes: col.modes.map((m, i) => {
        const mGuid = modeIdToGuid.get(m.modeId) ?? stringToGuid(m.modeId)
        return { id: mGuid, name: m.name, sortPosition: fractionalPosition(i) }
      })
    })

    appendVariablesForCollection(
      graph,
      nodeChanges,
      colGuid,
      internalCanvasGuid,
      col.variableIds,
      varIdToGuid,
      modeIdToGuid
    )
  }
}

function appendVariablesForCollection(
  graph: SceneGraph,
  nodeChanges: NodeChange[],
  colGuid: GUID,
  parentGuid: GUID,
  variableIds: string[],
  varIdToGuid: Map<string, GUID>,
  modeIdToGuid: Map<string, GUID>
): void {
  let varIdx = 0
  for (const varId of variableIds) {
    const variable = graph.variables.get(varId)
    if (!variable) continue

    const varGuid = varIdToGuid.get(varId) ?? stringToGuid(varId)
    const typeMap: Record<string, string> = {
      COLOR: 'COLOR',
      BOOLEAN: 'BOOLEAN',
      STRING: 'STRING'
    }
    const resolvedType = typeMap[variable.type] ?? 'FLOAT'

    const entries = Object.entries(variable.valuesByMode).map(([modeId, value]) => ({
      modeID: modeIdToGuid.get(modeId) ?? stringToGuid(modeId),
      variableData: variableValueToKiwi(value, variable.type, varIdToGuid)
    }))

    const nc: NodeChange = {
      guid: varGuid,
      parentIndex: { guid: parentGuid, position: fractionalPosition(varIdx++) },
      type: 'VARIABLE',
      name: variable.name,
      phase: 'CREATED',
      strokeAlign: 'CENTER',
      strokeJoin: 'BEVEL',
      variableSetID: { guid: colGuid },
      variableResolvedType: resolvedType,
      variableDataValues: { entries },
      variableScopes: ['ALL_SCOPES']
    }
    if (variable.key) nc.key = variable.key
    if (variable.version) nc.version = variable.version
    nodeChanges.push(nc)
  }
}
