import { describe, expect, test } from 'bun:test'

import { createEditor } from '@openweave/core/editor'

import { getNodeOrThrow } from '#tests/helpers/assert'

function makeComponent(editor: ReturnType<typeof createEditor>, name: string, y: number) {
  return editor.graph.createNode('COMPONENT', editor.state.currentPageId, {
    name,
    x: 100,
    y,
    width: 160,
    height: 60
  })
}

describe('addVariantToSet', () => {
  test('duplicates the default variant with the next free value and extends options', () => {
    const editor = createEditor()
    const a = makeComponent(editor, 'Button/Default', 100)
    const b = makeComponent(editor, 'Button/Hover', 200)
    editor.select([a.id, b.id])
    editor.createComponentSetFromComponents()

    const set = [...editor.graph.nodes.values()].find((n) => n.type === 'COMPONENT_SET')
    if (!set) throw new Error('component set not created')
    expect(set.childIds).toHaveLength(2)

    const newId = editor.addVariantToSet(set.id)
    if (!newId) throw new Error('addVariantToSet returned null')

    const clone = getNodeOrThrow(editor.graph, newId)
    expect(clone.type).toBe('COMPONENT')
    expect(clone.parentId).toBe(set.id)
    expect(clone.componentPropertyValues).toEqual({ Variant: 'Variant 3' })
    expect(clone.name).toBe('Variant 3')

    const defs = getNodeOrThrow(editor.graph, set.id).componentPropertyDefinitions
    const variantDef = defs.find((d) => d.type === 'VARIANT')
    expect(variantDef?.variantOptions).toContain('Variant 3')

    // Placed below the existing variants, inside the (grown) set.
    const siblings = set.childIds
      .filter((id) => id !== newId)
      .map((id) => getNodeOrThrow(editor.graph, id))
    const bottom = Math.max(...siblings.map((n) => n.y + n.height))
    expect(clone.y).toBeGreaterThanOrEqual(bottom)
    const grownSet = getNodeOrThrow(editor.graph, set.id)
    expect(grownSet.height).toBeGreaterThanOrEqual(clone.y + clone.height)
  })

  test('creates the Variant property when the set has none, assigning values to existing variants', () => {
    const editor = createEditor()
    const a = makeComponent(editor, 'Alpha', 100)
    const b = makeComponent(editor, 'Beta', 200)
    editor.select([a.id, b.id])
    editor.createComponentSetFromComponents()

    const set = [...editor.graph.nodes.values()].find((n) => n.type === 'COMPONENT_SET')
    if (!set) throw new Error('component set not created')
    expect(set.componentPropertyDefinitions).toHaveLength(0)

    const newId = editor.addVariantToSet(set.id)
    if (!newId) throw new Error('addVariantToSet returned null')

    const defs = getNodeOrThrow(editor.graph, set.id).componentPropertyDefinitions
    expect(defs).toHaveLength(1)
    expect(defs[0].name).toBe('Variant')

    const values = set.childIds.map(
      (id) => getNodeOrThrow(editor.graph, id).componentPropertyValues.Variant
    )
    expect(new Set(values).size).toBe(3)
    expect(values).toContain('Default')
  })

  test('addVariant on a standalone component wraps it into a set with a second variant', () => {
    const editor = createEditor()
    const comp = makeComponent(editor, 'Button', 100)
    editor.select([comp.id])

    const newId = editor.addVariant(comp.id)
    if (!newId) throw new Error('addVariant returned null')

    const original = getNodeOrThrow(editor.graph, comp.id)
    const setId = original.parentId
    if (!setId) throw new Error('component was not wrapped')
    const set = getNodeOrThrow(editor.graph, setId)
    expect(set.type).toBe('COMPONENT_SET')
    expect(set.childIds).toHaveLength(2)
    expect(original.componentPropertyValues.Variant).toBe('Default')
    expect(getNodeOrThrow(editor.graph, newId).componentPropertyValues.Variant).toBe('Variant 2')

    // The wrap + add collapse into one undo step.
    editor.undo.undo()
    expect(editor.graph.getNode(setId)).toBeUndefined()
    expect(getNodeOrThrow(editor.graph, comp.id).parentId).toBe(editor.state.currentPageId)
    expect(getNodeOrThrow(editor.graph, comp.id).type).toBe('COMPONENT')
  })

  test('undo removes the variant and restores definitions; redo brings it back', () => {
    const editor = createEditor()
    const a = makeComponent(editor, 'Button/Default', 100)
    const b = makeComponent(editor, 'Button/Hover', 200)
    editor.select([a.id, b.id])
    editor.createComponentSetFromComponents()
    const set = [...editor.graph.nodes.values()].find((n) => n.type === 'COMPONENT_SET')
    if (!set) throw new Error('component set not created')

    const prevOptions = [
      ...(set.componentPropertyDefinitions.find((d) => d.type === 'VARIANT')?.variantOptions ?? [])
    ]
    const newId = editor.addVariantToSet(set.id)
    if (!newId) throw new Error('addVariantToSet returned null')

    editor.undo.undo()
    expect(editor.graph.getNode(newId)).toBeUndefined()
    expect(
      getNodeOrThrow(editor.graph, set.id).componentPropertyDefinitions.find(
        (d) => d.type === 'VARIANT'
      )?.variantOptions
    ).toEqual(prevOptions)

    editor.undo.redo()
    const restored = getNodeOrThrow(editor.graph, newId)
    expect(restored.componentPropertyValues.Variant).toBe('Variant 3')
    expect(restored.parentId).toBe(set.id)
  })
})
