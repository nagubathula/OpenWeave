import { useOpenWeaveBindingProvider } from '#react/controls/binding-provider/openweave'
import type { BindingTarget } from '#react/controls/binding-provider/types'

import type { Editor } from '@openweave/core/editor'
import { randomHex } from '@openweave/core/random'
import type { VariableCollection } from '@openweave/scene-graph'

const FALLBACK_BOOLEAN_VARIABLE_NAME = 'New boolean'

function booleanCollection(editor: Editor): VariableCollection {
  const existing = editor
    .getCollections()
    .find((collection) =>
      collection.variableIds.some(
        (variableId) => editor.getVariable(variableId)?.type === 'BOOLEAN'
      )
    )
  if (existing) return existing

  const collection: VariableCollection = {
    id: `col:${randomHex(8)}`,
    name: 'Booleans',
    modes: [{ modeId: 'default', name: 'Mode 1' }],
    defaultModeId: 'default',
    variableIds: []
  }
  editor.addCollection(collection)
  return collection
}

export function createAndBindBooleanVariable(
  editor: Editor,
  target: BindingTarget,
  value: boolean,
  name = FALLBACK_BOOLEAN_VARIABLE_NAME
) {
  const collection = booleanCollection(editor)
  const id = `var:${randomHex(8)}`
  editor.addVariable({
    id,
    name: name.trim() || FALLBACK_BOOLEAN_VARIABLE_NAME,
    type: 'BOOLEAN',
    collectionId: collection.id,
    valuesByMode: Object.fromEntries(collection.modes.map((mode) => [mode.modeId, value])),
    description: '',
    hiddenFromPublishing: false
  })
  editor.bindVariable(target.nodeId, target.path, id)
}

function setBooleanVariableValue(editor: Editor, variableId: string, value: boolean) {
  const variable = editor.getVariable(variableId)
  if (!variable) return
  const collection = editor.getCollection(variable.collectionId)
  if (!collection) return
  for (const mode of collection.modes) editor.updateVariableValue(variableId, mode.modeId, value)
}

export function useBooleanBindingProvider() {
  return useOpenWeaveBindingProvider<boolean>({
    type: 'BOOLEAN',
    resolve: (editor, variableId) => editor.resolveBooleanVariable(variableId),
    create: createAndBindBooleanVariable,
    setValue: setBooleanVariableValue
  })
}
