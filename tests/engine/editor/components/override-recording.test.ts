import { describe, expect, test } from 'bun:test'

import { createEditor } from '@openweave/core/editor'

import { getNodeOrThrow } from '#tests/helpers/assert'

function makeComponentWithChild(editor: ReturnType<typeof createEditor>) {
  const component = editor.graph.createNode('COMPONENT', editor.state.currentPageId, {
    name: 'Card',
    x: 100,
    y: 100,
    width: 200,
    height: 100
  })
  const child = editor.graph.createNode('RECTANGLE', component.id, {
    name: 'Body',
    x: 0,
    y: 0,
    width: 200,
    height: 100,
    opacity: 1
  })
  const instanceId = editor.createInstanceFromComponent(component.id, 400, 100)
  if (!instanceId) throw new Error('instance not created')
  const instance = getNodeOrThrow(editor.graph, instanceId)
  const instanceChildId = instance.childIds[0]
  if (!instanceChildId) throw new Error('instance has no children')
  return { component, child, instance, instanceChildId }
}

describe('instance override recording', () => {
  test('editing an instance child records an override that survives main sync', () => {
    const editor = createEditor()
    const { component, child, instance, instanceChildId } = makeComponentWithChild(editor)

    editor.updateNodeWithUndo(instanceChildId, { opacity: 0.5 }, 'Set opacity')

    const live = getNodeOrThrow(editor.graph, instance.id)
    expect(live.overrides[`${instanceChildId}:opacity`]).toBe(0.5)

    // Change the main component's child: the overridden prop must stick, other
    // props must keep syncing.
    editor.graph.updateNode(child.id, { opacity: 0.9, cornerRadius: 12 })
    editor.graph.syncInstances(component.id)

    const instChild = getNodeOrThrow(editor.graph, instanceChildId)
    expect(instChild.opacity).toBe(0.5)
    expect(instChild.cornerRadius).toBe(12)
  })

  test('undoing the edit lifts the override so sync applies again', () => {
    const editor = createEditor()
    const { component, child, instance, instanceChildId } = makeComponentWithChild(editor)

    editor.updateNodeWithUndo(instanceChildId, { opacity: 0.5 }, 'Set opacity')
    editor.undo.undo()

    const live = getNodeOrThrow(editor.graph, instance.id)
    expect(`${instanceChildId}:opacity` in live.overrides).toBe(false)
    expect(getNodeOrThrow(editor.graph, instanceChildId).opacity).toBe(1)

    editor.graph.updateNode(child.id, { opacity: 0.9 })
    editor.graph.syncInstances(component.id)
    expect(getNodeOrThrow(editor.graph, instanceChildId).opacity).toBe(0.9)

    // Redo re-records the override.
    editor.undo.redo()
    expect(getNodeOrThrow(editor.graph, instance.id).overrides[`${instanceChildId}:opacity`]).toBe(
      0.5
    )
    expect(getNodeOrThrow(editor.graph, instanceChildId).opacity).toBe(0.5)
  })

  test('editing the instance root records a bare override key', () => {
    const editor = createEditor()
    const { component, instance } = makeComponentWithChild(editor)

    editor.updateNodeWithUndo(instance.id, { opacity: 0.3 }, 'Set opacity')
    expect(getNodeOrThrow(editor.graph, instance.id).overrides['opacity']).toBe(0.3)

    editor.graph.updateNode(component.id, { opacity: 0.8 })
    editor.graph.syncInstances(component.id)
    expect(getNodeOrThrow(editor.graph, instance.id).opacity).toBe(0.3)
  })

  test('non-synced props (x/y) record no override', () => {
    const editor = createEditor()
    const { instance, instanceChildId } = makeComponentWithChild(editor)

    editor.updateNodeWithUndo(instanceChildId, { x: 40 }, 'Move')
    expect(Object.keys(getNodeOrThrow(editor.graph, instance.id).overrides)).toHaveLength(0)
  })

  test('resetInstanceOverrides clears overrides, resyncs from main, and undoes', () => {
    const editor = createEditor()
    const { component, child, instance, instanceChildId } = makeComponentWithChild(editor)

    editor.updateNodeWithUndo(instanceChildId, { opacity: 0.5 }, 'Set opacity')
    editor.graph.updateNode(child.id, { opacity: 0.9 })
    editor.graph.syncInstances(component.id)
    expect(getNodeOrThrow(editor.graph, instanceChildId).opacity).toBe(0.5)

    editor.select([instance.id])
    editor.resetInstanceOverrides()

    expect(Object.keys(getNodeOrThrow(editor.graph, instance.id).overrides)).toHaveLength(0)
    expect(getNodeOrThrow(editor.graph, instanceChildId).opacity).toBe(0.9)

    editor.undo.undo()
    expect(getNodeOrThrow(editor.graph, instance.id).overrides[`${instanceChildId}:opacity`]).toBe(
      0.5
    )
    expect(getNodeOrThrow(editor.graph, instanceChildId).opacity).toBe(0.5)
  })
})
