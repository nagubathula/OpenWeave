import { describe, expect, test } from 'bun:test'

import { SceneGraph } from '@openweave/scene-graph'
import type { Variable, VariableCollection } from '@openweave/scene-graph'

describe('color libraries grouping & token resolution', () => {
  test('groups variables by slash path hierarchy matching Figma conventions', () => {
    const rawVariables: Variable[] = [
      {
        id: 'var_warning',
        name: 'warning-text',
        type: 'COLOR',
        collectionId: 'col_1',
        valuesByMode: { default: { r: 0.9, g: 0.6, b: 0.1, a: 1 } },
        description: '',
        hiddenFromPublishing: false
      },
      {
        id: 'var_error',
        name: 'error-text',
        type: 'COLOR',
        collectionId: 'col_1',
        valuesByMode: { default: { r: 0.9, g: 0.2, b: 0.2, a: 1 } },
        description: '',
        hiddenFromPublishing: false
      },
      {
        id: 'var_ring',
        name: 'color/focus/ring',
        type: 'COLOR',
        collectionId: 'col_1',
        valuesByMode: { default: { r: 0.2, g: 0.5, b: 1, a: 1 } },
        description: '',
        hiddenFromPublishing: false
      },
      {
        id: 'var_accent',
        name: 'color/apple/accent',
        type: 'COLOR',
        collectionId: 'col_1',
        valuesByMode: { default: { r: 0, g: 0.48, b: 1, a: 1 } },
        description: '',
        hiddenFromPublishing: false
      },
      {
        id: 'var_accent_hover',
        name: 'color/apple/accent-hover',
        type: 'COLOR',
        collectionId: 'col_1',
        valuesByMode: { default: { r: 0, g: 0.38, b: 0.9, a: 1 } },
        description: '',
        hiddenFromPublishing: false
      },
      {
        id: 'var_grouped',
        name: 'color/apple/background/grouped',
        type: 'COLOR',
        collectionId: 'col_1',
        valuesByMode: { default: { r: 1, g: 1, b: 1, a: 1 } },
        description: '',
        hiddenFromPublishing: false
      }
    ]

    const groupsMap = new Map<string, Array<{ leaf: string; id: string }>>()
    for (const v of rawVariables) {
      const lastSlash = v.name.lastIndexOf('/')
      const group = lastSlash !== -1 ? v.name.slice(0, lastSlash) : ''
      const leaf = lastSlash !== -1 ? v.name.slice(lastSlash + 1) : v.name

      const items = groupsMap.get(group) ?? []
      items.push({ leaf, id: v.id })
      groupsMap.set(group, items)
    }

    // Ungrouped items: warning-text, error-text
    expect(groupsMap.get('')?.map((i) => i.leaf)).toEqual(['warning-text', 'error-text'])

    // Group 'color/focus': ring
    expect(groupsMap.get('color/focus')?.map((i) => i.leaf)).toEqual(['ring'])

    // Group 'color/apple': accent, accent-hover
    expect(groupsMap.get('color/apple')?.map((i) => i.leaf)).toEqual(['accent', 'accent-hover'])

    // Group 'color/apple/background': grouped
    expect(groupsMap.get('color/apple/background')?.map((i) => i.leaf)).toEqual(['grouped'])
  })

  test('filters color variables by collection and search term', () => {
    const _colA: VariableCollection = {
      id: 'col_brand',
      name: 'Brand',
      modes: [{ modeId: 'default', name: 'Mode 1' }],
      defaultModeId: 'default',
      variableIds: ['v1', 'v2']
    }
    const _colB: VariableCollection = {
      id: 'col_system',
      name: 'System',
      modes: [{ modeId: 'default', name: 'Mode 1' }],
      defaultModeId: 'default',
      variableIds: ['v3']
    }

    const variables: Variable[] = [
      {
        id: 'v1',
        name: 'brand/primary',
        type: 'COLOR',
        collectionId: 'col_brand',
        valuesByMode: { default: { r: 0.1, g: 0.2, b: 0.8, a: 1 } },
        description: '',
        hiddenFromPublishing: false
      },
      {
        id: 'v2',
        name: 'brand/secondary',
        type: 'COLOR',
        collectionId: 'col_brand',
        valuesByMode: { default: { r: 0.4, g: 0.7, b: 0.3, a: 1 } },
        description: '',
        hiddenFromPublishing: false
      },
      {
        id: 'v3',
        name: 'system/background',
        type: 'COLOR',
        collectionId: 'col_system',
        valuesByMode: { default: { r: 0.95, g: 0.95, b: 0.95, a: 1 } },
        description: '',
        hiddenFromPublishing: false
      }
    ]

    // Filter by collection
    const brandVars = variables.filter((v) => v.collectionId === 'col_brand')
    expect(brandVars.length).toBe(2)

    // Filter by search
    const query = 'sec'
    const searchResults = variables.filter((v) => v.name.toLowerCase().includes(query))
    expect(searchResults.length).toBe(1)
    expect(searchResults[0].name).toBe('brand/secondary')
  })

  test('scene graph resolves bound color variable correctly', () => {
    const graph = new SceneGraph()
    const pageId = graph.getPages()[0].id
    const col: VariableCollection = {
      id: 'col_tokens',
      name: 'Tokens',
      modes: [{ modeId: 'light', name: 'Light' }],
      defaultModeId: 'light',
      variableIds: ['var_blue']
    }
    graph.addCollection(col)

    const blueColor = { r: 0.1, g: 0.5, b: 0.9, a: 1 }
    graph.addVariable({
      id: 'var_blue',
      name: 'color/apple/accent',
      type: 'COLOR',
      collectionId: 'col_tokens',
      valuesByMode: { light: blueColor },
      description: '',
      hiddenFromPublishing: false
    })

    const node = graph.createNode('RECTANGLE', pageId, {
      name: 'Box',
      fills: [{ type: 'SOLID', color: { r: 0, g: 0, b: 0, a: 1 }, opacity: 1, visible: true }],
      boundVariables: { 'fills/0/color': 'var_blue' }
    })

    const resolved = graph.resolveColorVariable('var_blue')
    expect(resolved).toEqual(blueColor)

    const boundId = node.boundVariables['fills/0/color']
    expect(boundId).toBe('var_blue')
  })
})
