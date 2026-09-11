import { useOpenWeaveBindingProvider } from '#react/controls/binding-provider/openweave'
import type { BindingTarget } from '#react/controls/binding-provider/types'

import type { Editor } from '@openweave/core/editor'
import { randomHex } from '@openweave/core/random'
import type { VariableCollection } from '@openweave/scene-graph'

const FALLBACK_STRING_VARIABLE_NAME = 'New text'

function stringCollection(editor: Editor): VariableCollection {
  const existing = editor
    .getCollections()
    .find((collection) =>
      collection.variableIds.some((variableId) => editor.getVariable(variableId)?.type === 'STRING')
    )
  if (existing) return existing

  const collection: VariableCollection = {
    id: `col:${randomHex(8)}`,
    name: 'Text',
    modes: [{ modeId: 'default', name: 'Mode 1' }],
    defaultModeId: 'default',
    variableIds: []
  }
  editor.addCollection(collection)
  return collection
}

export function createAndBindStringVariable(
  editor: Editor,
  target: BindingTarget,
  value: string,
  name = FALLBACK_STRING_VARIABLE_NAME
) {
  const collection = stringCollection(editor)
  const id = `var:${randomHex(8)}`
  editor.addVariable({
    id,
    name: name.trim() || FALLBACK_STRING_VARIABLE_NAME,
    type: 'STRING',
    collectionId: collection.id,
    valuesByMode: Object.fromEntries(collection.modes.map((mode) => [mode.modeId, value])),
    description: '',
    hiddenFromPublishing: false
  })
  editor.bindVariable(target.nodeId, target.path, id)
}

function setStringVariableValue(editor: Editor, variableId: string, value: string) {
  const variable = editor.getVariable(variableId)
  if (!variable) return
  const collection = editor.getCollection(variable.collectionId)
  if (!collection) return
  for (const mode of collection.modes) editor.updateVariableValue(variableId, mode.modeId, value)
}

export function useStringBindingProvider() {
  return useOpenWeaveBindingProvider<string>({
    type: 'STRING',
    resolve: (editor, variableId) => editor.resolveStringVariable(variableId),
    create: createAndBindStringVariable,
    setValue: setStringVariableValue
  })
}
