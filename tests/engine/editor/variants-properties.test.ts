import { describe, expect, test } from 'bun:test'

import { createEditor } from '@openweave/core/editor'

import { getNodeOrThrow } from '#tests/helpers/assert'

function makeSet(editor: ReturnType<typeof createEditor>) {
  const pageId = editor.state.currentPageId
  const a = editor.graph.createNode('COMPONENT', pageId, {
    name: 'Button/Default',
    x: 100,
    y: 100,
    width: 160,
    height: 60
  })
  const b = editor.graph.createNode('COMPONENT', pageId, {
    name: 'Button/Hover',
    x: 100,
    y: 200,
    width: 160,
    height: 60
  })
  editor.select([a.id, b.id])
  editor.createComponentSetFromComponents()
  const set = [...editor.graph.nodes.values()].find((n) => n.type === 'COMPONENT_SET')
  if (!set) throw new Error('component set not created')
  return { set, a, b }
}

describe('variant property editing', () => {
  test('setVariantPropertyValue renames the child and extends options', () => {
    const editor = createEditor()
    const { set, b } = makeSet(editor)

    editor.setVariantPropertyValue(b.id, 'Variant', 'Pressed')

    const child = getNodeOrThrow(editor.graph, b.id)
    expect(child.componentPropertyValues.Variant).toBe('Pressed')
    expect(child.name).toBe('Pressed')
    const def = getNodeOrThrow(editor.graph, set.id).componentPropertyDefinitions[0]
    expect(def.variantOptions).toContain('Pressed')

    editor.undo.undo()
    expect(getNodeOrThrow(editor.graph, b.id).componentPropertyValues.Variant).toBe('Hover')
    expect(getNodeOrThrow(editor.graph, b.id).name).toBe('Hover')
  })

  test('adding a VARIANT property assigns its default to existing variants', () => {
    const editor = createEditor()
    const { set, a, b } = makeSet(editor)

    editor.addPropertyDefinition(set.id, 'Size', 'VARIANT', 'Medium')

    expect(getNodeOrThrow(editor.graph, a.id).componentPropertyValues.Size).toBe('Medium')
    expect(getNodeOrThrow(editor.graph, b.id).componentPropertyValues.Size).toBe('Medium')
    expect(getNodeOrThrow(editor.graph, set.id).componentPropertyDefinitions).toHaveLength(2)

    editor.undo.undo()
    expect(getNodeOrThrow(editor.graph, a.id).componentPropertyValues.Size).toBeUndefined()
    expect(getNodeOrThrow(editor.graph, set.id).componentPropertyDefinitions).toHaveLength(1)
  })

  test('TEXT property on a standalone component binds a text layer and drives instances', () => {
    const editor = createEditor()
    const pageId = editor.state.currentPageId
    const comp = editor.graph.createNode('COMPONENT', pageId, {
      name: 'Card',
      x: 100,
      y: 100,
      width: 200,
      height: 100
    })
    const label = editor.graph.createNode('TEXT', comp.id, {
      name: 'Label',
      x: 10,
      y: 10,
      width: 100,
      height: 20,
      text: 'Hello'
    })

    const propId = editor.addPropertyDefinition(comp.id, 'Text', 'TEXT', 'Hello')
    if (!propId) throw new Error('addPropertyDefinition failed')
    editor.setComponentPropertyReference(label.id, 'TEXT', propId)

    // Layers inside the component see the definition.
    const { ownerId, defs } = editor.componentPropertyDefsForNode(label.id)
    expect(ownerId).toBe(comp.id)
    expect(defs.map((d) => d.id)).toContain(propId)

    // Instance panel: definition is exposed and edits the instance's copy.
    editor.createInstanceFromComponent(comp.id)
    const instance = [...editor.graph.nodes.values()].find((n) => n.type === 'INSTANCE')
    if (!instance) throw new Error('instance not created')
    const instanceDefs = editor.getInstanceComponentPropertyDefinitions(instance.id)
    expect(instanceDefs.map((d) => d.id)).toContain(propId)

    editor.setInstanceComponentProperty(instance.id, propId, 'Buy now')
    const instanceLabel = getNodeOrThrow(editor.graph, instance.childIds[0])
    expect(instanceLabel.text).toBe('Buy now')
    // The main component's label is untouched.
    expect(getNodeOrThrow(editor.graph, label.id).text).toBe('Hello')
  })

  test('BOOLEAN property bound to visibility drives instances and detaches cleanly', () => {
    const editor = createEditor()
    const pageId = editor.state.currentPageId
    const comp = editor.graph.createNode('COMPONENT', pageId, {
      name: 'Card',
      x: 100,
      y: 100,
      width: 200,
      height: 100
    })
    const icon = editor.graph.createNode('RECTANGLE', comp.id, {
      name: 'Icon',
      x: 10,
      y: 10,
      width: 20,
      height: 20
    })

    const propId = editor.addPropertyDefinition(comp.id, 'Show icon', 'BOOLEAN', 'true')
    if (!propId) throw new Error('addPropertyDefinition failed')
    editor.setComponentPropertyReference(icon.id, 'VISIBLE', propId)
    expect(getNodeOrThrow(editor.graph, icon.id).componentPropertyReferences).toEqual([
      { propertyId: propId, field: 'VISIBLE' }
    ])

    editor.createInstanceFromComponent(comp.id)
    const instance = [...editor.graph.nodes.values()].find((n) => n.type === 'INSTANCE')
    if (!instance) throw new Error('instance not created')

    editor.setInstanceComponentProperty(instance.id, propId, 'false')
    expect(getNodeOrThrow(editor.graph, instance.childIds[0]).visible).toBe(false)
    // The main component's layer is untouched.
    expect(getNodeOrThrow(editor.graph, icon.id).visible).toBe(true)

    editor.undo.undo()
    expect(getNodeOrThrow(editor.graph, instance.childIds[0]).visible).toBe(true)

    // Detach: the reference goes away and undo restores it.
    editor.setComponentPropertyReference(icon.id, 'VISIBLE', null)
    expect(getNodeOrThrow(editor.graph, icon.id).componentPropertyReferences).toHaveLength(0)
    editor.undo.undo()
    expect(getNodeOrThrow(editor.graph, icon.id).componentPropertyReferences).toEqual([
      { propertyId: propId, field: 'VISIBLE' }
    ])
  })

  test('componentPropertyDefsForNode merges set and component definitions', () => {
    const editor = createEditor()
    const { set, a } = makeSet(editor)
    const textPropId = editor.addPropertyDefinition(a.id, 'Label', 'TEXT', 'Hi')
    if (!textPropId) throw new Error('addPropertyDefinition failed')
    const layer = editor.graph.createNode('TEXT', a.id, {
      name: 'Label',
      x: 10,
      y: 10,
      width: 100,
      height: 20,
      text: 'Hi'
    })

    const { ownerId, defs } = editor.componentPropertyDefsForNode(layer.id)
    expect(ownerId).toBe(set.id)
    expect(defs.map((d) => d.name).sort()).toEqual(['Label', 'Variant'])

    // A layer outside any main component sees no definitions.
    const loose = editor.graph.createNode('RECTANGLE', editor.state.currentPageId, {
      name: 'Loose',
      x: 0,
      y: 0,
      width: 10,
      height: 10
    })
    expect(editor.componentPropertyDefsForNode(loose.id)).toEqual({ ownerId: null, defs: [] })
  })

  test('rename and remove property definitions update variant children', () => {
    const editor = createEditor()
    const { set, a } = makeSet(editor)
    const defId = getNodeOrThrow(editor.graph, set.id).componentPropertyDefinitions[0].id

    editor.renamePropertyDefinition(set.id, defId, 'State')
    expect(getNodeOrThrow(editor.graph, a.id).componentPropertyValues.State).toBe('Default')
    expect(getNodeOrThrow(editor.graph, a.id).componentPropertyValues.Variant).toBeUndefined()

    editor.removePropertyDefinition(set.id, defId)
    expect(getNodeOrThrow(editor.graph, set.id).componentPropertyDefinitions).toHaveLength(0)
    expect(getNodeOrThrow(editor.graph, a.id).componentPropertyValues.State).toBeUndefined()
  })
})
