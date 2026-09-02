import { describe, expect, test } from 'bun:test'

import {
  MIXED,
  booleanVariantPair,
  compatibleComponentPropertyDefinitions,
  instanceSwapOptions,
  mergedComponentPropertyValue
} from '@openweave/react'
import { SceneGraph } from '@openweave/scene-graph'

describe('component property control model', () => {
  test('requires identical ordered property IDs and types', () => {
    const definitions = [
      { id: '1:1', name: 'Label', type: 'TEXT' as const, defaultValue: 'Default' },
      { id: '1:2', name: 'Visible', type: 'BOOLEAN' as const, defaultValue: 'true' }
    ]
    expect(
      compatibleComponentPropertyDefinitions([definitions, structuredClone(definitions)])
    ).toBe(definitions)
    expect(
      compatibleComponentPropertyDefinitions([
        definitions,
        [{ ...definitions[0], type: 'BOOLEAN' as const }]
      ])
    ).toEqual([])
  })

  test('models mixed values and preferred instance swap options', () => {
    expect(mergedComponentPropertyValue(['A', 'A'])).toBe('A')
    expect(mergedComponentPropertyValue(['A', 'B'])).toBe(MIXED)

    const graph = new SceneGraph()
    const pageId = graph.getPages()[0].id
    const secondary = graph.createNode('COMPONENT', pageId, { name: 'Secondary' })
    const preferred = graph.createNode('COMPONENT', pageId, {
      name: 'Preferred',
      componentKey: 'preferred-key'
    })
    expect(
      instanceSwapOptions(
        [secondary, preferred],
        {
          id: '1:3',
          name: 'Icon',
          type: 'INSTANCE_SWAP',
          defaultValue: secondary.id,
          preferredValues: ['preferred-key']
        },
        'missing-id'
      )
    ).toEqual([
      { value: preferred.id, label: 'Preferred' },
      { value: secondary.id, label: 'Secondary' },
      { value: 'missing-id', label: 'missing-id', missing: true }
    ])
  })
})

describe('booleanVariantPair', () => {
  const opts = (...values: string[]) => values.map((value) => ({ value, label: value }))

  test('detects True/False, Yes/No, and On/Off pairs in either order and any casing', () => {
    expect(booleanVariantPair(opts('True', 'False'))).toEqual({ on: 'True', off: 'False' })
    expect(booleanVariantPair(opts('false', 'true'))).toEqual({ on: 'true', off: 'false' })
    expect(booleanVariantPair(opts('YES', 'no'))).toEqual({ on: 'YES', off: 'no' })
    expect(booleanVariantPair(opts('Off', 'On'))).toEqual({ on: 'On', off: 'Off' })
  })

  test('rejects non-boolean value sets', () => {
    expect(booleanVariantPair(opts('Default', 'Hover'))).toBeNull()
    expect(booleanVariantPair(opts('True', 'False', 'Maybe'))).toBeNull()
    expect(booleanVariantPair(opts('True'))).toBeNull()
    expect(booleanVariantPair(opts('True', 'No'))).toBeNull()
    expect(booleanVariantPair([])).toBeNull()
  })
})
