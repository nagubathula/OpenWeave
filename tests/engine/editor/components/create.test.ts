import { describe, expect, test } from 'bun:test'

import { createEditor } from '@openweave/core/editor'

import { getNodeOrThrow } from '#tests/helpers/assert'

describe('createComponentFromSelection', () => {
  test('converts an instance to a component', () => {
    const editor = createEditor()
    const comp = editor.graph.createNode('COMPONENT', editor.state.currentPageId, {
      name: 'Button',
      width: 100,
      height: 40
    })
    const instanceId = editor.createInstanceFromComponent(comp.id)
    if (!instanceId) throw new Error('Failed to create instance')

    editor.select([instanceId])
    editor.createComponentFromSelection()

    const node = getNodeOrThrow(editor.graph, instanceId)
    expect(node.type).toBe('COMPONENT')
    expect(node.componentId).toBeNull()

    // Undo restores it to INSTANCE
    editor.undo.undo()
    const restored = getNodeOrThrow(editor.graph, instanceId)
    expect(restored.type).toBe('INSTANCE')
    expect(restored.componentId).toBe(comp.id)

    // Redo converts back to COMPONENT
    editor.undo.redo()
    const redone = getNodeOrThrow(editor.graph, instanceId)
    expect(redone.type).toBe('COMPONENT')
    expect(redone.componentId).toBeNull()
  })
})
