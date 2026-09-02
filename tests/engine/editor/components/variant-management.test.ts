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

function makeButtonSet(editor: ReturnType<typeof createEditor>) {
  const a = makeComponent(editor, 'Button/Default', 100)
  const b = makeComponent(editor, 'Button/Hover', 200)
  editor.select([a.id, b.id])
  editor.createComponentSetFromComponents()
  const set = [...editor.graph.nodes.values()].find((n) => n.type === 'COMPONENT_SET')
  if (!set) throw new Error('component set not created')
  return { set, a, b }
}

describe('movePropertyDefinition', () => {
  test('reorders definitions and rebuilds variant names; undo restores', () => {
    const editor = createEditor()
    const a = makeComponent(editor, 'Card/Primary/Large', 100)
    const b = makeComponent(editor, 'Card/Secondary/Small', 200)
    editor.select([a.id, b.id])
    editor.createComponentSetFromComponents()
    const set = [...editor.graph.nodes.values()].find((n) => n.type === 'COMPONENT_SET')
    if (!set) throw new Error('set not created')

    const [first, second] = set.componentPropertyDefinitions
    expect([first.name, second.name]).toEqual(['Variant', 'Property 2'])
    expect(getNodeOrThrow(editor.graph, a.id).name).toBe('Primary, Large')

    editor.movePropertyDefinition(set.id, second.id, -1)
    const reordered = getNodeOrThrow(editor.graph, set.id).componentPropertyDefinitions
    expect(reordered.map((d) => d.name)).toEqual(['Property 2', 'Variant'])
    expect(getNodeOrThrow(editor.graph, a.id).name).toBe('Large, Primary')

    editor.undo.undo()
    expect(
      getNodeOrThrow(editor.graph, set.id).componentPropertyDefinitions.map((d) => d.name)
    ).toEqual(['Variant', 'Property 2'])
    expect(getNodeOrThrow(editor.graph, a.id).name).toBe('Primary, Large')
  })
})

describe('resolveVariantConflicts', () => {
  test('renames duplicate combinations to unique values in one undo step', () => {
    const editor = createEditor()
    const { set, b } = makeButtonSet(editor)
    // Force a conflict: both variants become "Default".
    editor.setVariantPropertyValue(b.id, 'Variant', 'Default')
    expect(editor.getComponentSetVariantConflicts(set.id)).toHaveLength(1)

    const renamed = editor.resolveVariantConflicts(set.id)
    expect(renamed).toBe(1)
    expect(editor.getComponentSetVariantConflicts(set.id)).toHaveLength(0)
    const values = editor
      .getComponentSetVariants(set.id)
      .map((v) => v.componentPropertyValues['Variant'])
      .sort()
    expect(values).toEqual(['Default', 'Default 2'])

    editor.undo.undo()
    expect(editor.getComponentSetVariantConflicts(set.id)).toHaveLength(1)
  })
})

describe('duplicate variant uniqueness', () => {
  test('Ctrl+D inside a set assigns a fresh value instead of a conflict', () => {
    const editor = createEditor()
    const { set, a } = makeButtonSet(editor)
    editor.select([a.id])
    editor.duplicateSelected()

    expect(editor.getComponentSetVariantConflicts(set.id)).toHaveLength(0)
    const values = editor
      .getComponentSetVariants(set.id)
      .map((v) => v.componentPropertyValues['Variant'])
      .sort()
    expect(values).toEqual(['Default', 'Default 2', 'Hover'])
  })
})

describe('arrangeComponentSetVariants', () => {
  test('lays variants out as a row and resizes the set; undo restores', () => {
    const editor = createEditor()
    const { set, a, b } = makeButtonSet(editor)
    const prevA = {
      x: getNodeOrThrow(editor.graph, a.id).x,
      y: getNodeOrThrow(editor.graph, a.id).y
    }

    editor.arrangeComponentSetVariants(set.id, 'row')
    const liveA = getNodeOrThrow(editor.graph, a.id)
    const liveB = getNodeOrThrow(editor.graph, b.id)
    expect(liveA.y).toBe(liveB.y)
    expect(liveB.x).toBeGreaterThan(liveA.x)
    const liveSet = getNodeOrThrow(editor.graph, set.id)
    expect(liveSet.width).toBe(40 + 160 + 40 + 160 + 40)

    editor.undo.undo()
    expect(getNodeOrThrow(editor.graph, a.id).x).toBe(prevA.x)
    expect(getNodeOrThrow(editor.graph, a.id).y).toBe(prevA.y)
  })

  test('column stacks variants vertically', () => {
    const editor = createEditor()
    const { set, a, b } = makeButtonSet(editor)
    editor.arrangeComponentSetVariants(set.id, 'column')
    const liveA = getNodeOrThrow(editor.graph, a.id)
    const liveB = getNodeOrThrow(editor.graph, b.id)
    expect(liveA.x).toBe(liveB.x)
    expect(liveB.y).toBeGreaterThan(liveA.y)
  })
})

describe('setPropertyDefinitionPreferredValues', () => {
  test('stores and undoes the allow-list on swap properties', () => {
    const editor = createEditor()
    const { set } = makeButtonSet(editor)
    const propId = editor.addPropertyDefinition(set.id, 'Icon', 'INSTANCE_SWAP', '')
    if (!propId) throw new Error('property not created')

    editor.setPropertyDefinitionPreferredValues(set.id, propId, ['comp-1', 'comp-2'])
    const def = () =>
      getNodeOrThrow(editor.graph, set.id).componentPropertyDefinitions.find((d) => d.id === propId)
    expect(def()?.preferredValues).toEqual(['comp-1', 'comp-2'])

    editor.undo.undo()
    expect(def()?.preferredValues).toBeUndefined()
  })
})

describe('variant membership on reparent', () => {
  test('a component dropped into a set gets seeded, unique values', () => {
    const editor = createEditor()
    const { set } = makeButtonSet(editor)
    const chip = makeComponent(editor, 'Chip', 400)

    editor.reparentNodes([chip.id], set.id)
    const live = getNodeOrThrow(editor.graph, chip.id)
    expect(live.parentId).toBe(set.id)
    expect(live.componentPropertyValues['Variant']).toBe('Chip')
    expect(live.name).toBe('Chip')
    expect(editor.getComponentSetVariantConflicts(set.id)).toHaveLength(0)
  })

  test('a variant pulled out becomes a standalone slash-named component', () => {
    const editor = createEditor()
    const { set, a } = makeButtonSet(editor)

    editor.reparentNodes([a.id], editor.state.currentPageId)
    const live = getNodeOrThrow(editor.graph, a.id)
    expect(live.parentId).toBe(editor.state.currentPageId)
    expect(live.name).toBe('Button/Default')
    expect(Object.keys(live.componentPropertyValues)).toHaveLength(0)
    expect(getNodeOrThrow(editor.graph, set.id).childIds).toHaveLength(1)
  })

  test('non-components cannot be reparented into a set', () => {
    const editor = createEditor()
    const { set } = makeButtonSet(editor)
    const rect = editor.graph.createNode('RECTANGLE', editor.state.currentPageId, {
      width: 50,
      height: 50
    })
    editor.reparentNodes([rect.id], set.id)
    expect(getNodeOrThrow(editor.graph, rect.id).parentId).toBe(editor.state.currentPageId)
  })
})

describe('renameVariantValue', () => {
  test('renames a value across variants, options, and the default; undo restores', () => {
    const editor = createEditor()
    const { set, b } = makeButtonSet(editor)
    editor.setPropertyDefinitionDefault(set.id, set.componentPropertyDefinitions[0].id, 'Hover')

    editor.renameVariantValue(set.id, 'Variant', 'Hover', 'Hovered')

    const liveB = getNodeOrThrow(editor.graph, b.id)
    expect(liveB.componentPropertyValues['Variant']).toBe('Hovered')
    expect(liveB.name).toBe('Hovered')
    const def = getNodeOrThrow(editor.graph, set.id).componentPropertyDefinitions[0]
    expect(def.defaultValue).toBe('Hovered')
    expect([...editor.collectVariantOptions(set.id).get('Variant')!]).not.toContain('Hover')

    editor.undo.undo()
    expect(getNodeOrThrow(editor.graph, b.id).componentPropertyValues['Variant']).toBe('Hover')
    expect(getNodeOrThrow(editor.graph, set.id).componentPropertyDefinitions[0].defaultValue).toBe(
      'Hover'
    )
  })
})

describe('movePropertyDefinition with multi-step delta', () => {
  test('splices across several positions (drag reorder)', () => {
    const editor = createEditor()
    const { set } = makeButtonSet(editor)
    editor.addPropertyDefinition(set.id, 'Label', 'TEXT', 'Hi')
    editor.addPropertyDefinition(set.id, 'Icon', 'INSTANCE_SWAP', '')
    const names = () =>
      getNodeOrThrow(editor.graph, set.id).componentPropertyDefinitions.map((d) => d.name)
    expect(names()).toEqual(['Variant', 'Label', 'Icon'])

    const iconId = getNodeOrThrow(editor.graph, set.id).componentPropertyDefinitions[2].id
    editor.movePropertyDefinition(set.id, iconId, -2)
    expect(names()).toEqual(['Icon', 'Variant', 'Label'])
  })
})

describe('variant default picker on VARIANT properties', () => {
  test('setPropertyDefinitionDefault accepts variant properties and drives the default variant', () => {
    const editor = createEditor()
    const { set, b } = makeButtonSet(editor)
    editor.setPropertyDefinitionDefault(set.id, set.componentPropertyDefinitions[0].id, 'Hover')
    expect(editor.getDefaultVariantForComponentSet(set.id)?.id).toBe(b.id)
  })
})
