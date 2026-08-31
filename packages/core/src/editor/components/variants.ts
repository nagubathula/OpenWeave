import { omit } from 'es-toolkit/object'

import type {
  ComponentPropertyDefinition,
  ComponentPropertyType,
  SceneNode
} from '@openweave/scene-graph'
import { buildVariantName, parseVariantName } from '@openweave/scene-graph/variant-name'

import { restoreSubtree, snapshotSubtree } from '#core/editor/clipboard/subtree-history'
import { reapplyInstanceComponentProperties } from '#core/editor/components/properties'
import type { EditorContext } from '#core/editor/types'
import { randomHex } from '#core/random'

export type VariantConflict = {
  values: Record<string, string>
  componentIds: string[]
}

function sortByCanvasPosition(a: SceneNode, b: SceneNode) {
  return a.y - b.y || a.x - b.x || a.name.localeCompare(b.name)
}

export function createVariantActions(ctx: EditorContext) {
  function getComponentSetPropertyDefs(componentSetId: string): ComponentPropertyDefinition[] {
    const node = ctx.graph.getNode(componentSetId)
    if (node?.type !== 'COMPONENT_SET' && node?.type !== 'COMPONENT') return []
    return node.componentPropertyDefinitions
  }

  function addPropertyDefinition(
    componentSetId: string,
    name: string,
    type: ComponentPropertyType = 'VARIANT',
    defaultValue = ''
  ): string | undefined {
    const node = ctx.graph.getNode(componentSetId)
    // Non-variant properties may live on a standalone component; variant
    // properties only make sense on a set.
    if (node?.type !== 'COMPONENT_SET' && !(node?.type === 'COMPONENT' && type !== 'VARIANT')) {
      return undefined
    }
    const id = `prop:${randomHex(8)}`
    const def: ComponentPropertyDefinition = {
      id,
      name,
      type,
      defaultValue,
      variantOptions: type === 'VARIANT' ? [defaultValue] : undefined
    }
    const prevDefs = [...node.componentPropertyDefinitions]

    // A new variant property applies its default to every existing variant.
    const isVariantOnSet = type === 'VARIANT' && node.type === 'COMPONENT_SET'
    const variantChildren = isVariantOnSet ? getComponentSetVariants(componentSetId) : []
    const prevChildValues = new Map(
      variantChildren.map((child) => [child.id, { ...child.componentPropertyValues }])
    )
    const assignChildDefaults = () => {
      if (!isVariantOnSet) return
      for (const childId of prevChildValues.keys()) {
        const child = ctx.graph.getNode(childId)
        if (!child) continue
        if (name in child.componentPropertyValues) continue
        ctx.graph.updateNode(childId, {
          componentPropertyValues: { ...child.componentPropertyValues, [name]: defaultValue }
        })
      }
    }

    ctx.graph.updateNode(componentSetId, {
      componentPropertyDefinitions: [...prevDefs, def]
    })
    assignChildDefaults()
    ctx.undo.push({
      label: 'Add property',
      forward: () => {
        const n = ctx.graph.getNode(componentSetId)
        if (n) {
          ctx.graph.updateNode(componentSetId, {
            componentPropertyDefinitions: [...n.componentPropertyDefinitions, def]
          })
          assignChildDefaults()
        }
        ctx.requestRender()
      },
      inverse: () => {
        ctx.graph.updateNode(componentSetId, {
          componentPropertyDefinitions: prevDefs
        })
        for (const [childId, values] of prevChildValues) {
          ctx.graph.updateNode(childId, { componentPropertyValues: values })
        }
        ctx.requestRender()
      }
    })
    ctx.requestRender()
    return id
  }

  function removePropertyDefinition(componentSetId: string, propertyId: string) {
    const node = ctx.graph.getNode(componentSetId)
    if (node?.type !== 'COMPONENT_SET' && node?.type !== 'COMPONENT') return
    const prevDefs = [...node.componentPropertyDefinitions]
    const def = prevDefs.find((d) => d.id === propertyId)
    if (!def) return
    ctx.graph.updateNode(componentSetId, {
      componentPropertyDefinitions: prevDefs.filter((d) => d.id !== propertyId)
    })
    for (const childId of node.childIds) {
      const child = ctx.graph.getNode(childId)
      if (!child) continue
      const values = omit(child.componentPropertyValues, [def.name])
      ctx.graph.updateNode(childId, { componentPropertyValues: values })
    }
    ctx.undo.push({
      label: 'Remove property',
      forward: () => {
        const n = ctx.graph.getNode(componentSetId)
        if (n) {
          ctx.graph.updateNode(componentSetId, {
            componentPropertyDefinitions: n.componentPropertyDefinitions.filter(
              (d) => d.id !== propertyId
            )
          })
          for (const cid of n.childIds) {
            const c = ctx.graph.getNode(cid)
            if (!c) continue
            const v = omit(c.componentPropertyValues, [def.name])
            ctx.graph.updateNode(cid, { componentPropertyValues: v })
          }
        }
        ctx.requestRender()
      },
      inverse: () => {
        ctx.graph.updateNode(componentSetId, {
          componentPropertyDefinitions: prevDefs
        })
        ctx.requestRender()
      }
    })
    ctx.requestRender()
  }

  function renamePropertyDefinition(componentSetId: string, propertyId: string, newName: string) {
    const node = ctx.graph.getNode(componentSetId)
    if (node?.type !== 'COMPONENT_SET' && node?.type !== 'COMPONENT') return
    const def = node.componentPropertyDefinitions.find((d) => d.id === propertyId)
    if (!def) return
    const prevName = def.name
    const newDefs = node.componentPropertyDefinitions.map((d) =>
      d.id === propertyId ? { ...d, name: newName } : d
    )
    ctx.graph.updateNode(componentSetId, { componentPropertyDefinitions: newDefs })
    for (const childId of node.childIds) {
      const child = ctx.graph.getNode(childId)
      if (!child) continue
      const values = { ...child.componentPropertyValues }
      if (prevName in values) {
        const nextValues: Record<string, string> = omit(values, [prevName])
        nextValues[newName] = values[prevName]
        ctx.graph.updateNode(childId, { componentPropertyValues: nextValues })
      }
    }
    const renamePropertyDef = (name: string) => {
      const n = ctx.graph.getNode(componentSetId)
      if (!n) return
      ctx.graph.updateNode(componentSetId, {
        componentPropertyDefinitions: n.componentPropertyDefinitions.map((d) =>
          d.id === propertyId ? { ...d, name } : d
        )
      })
      ctx.requestRender()
    }
    ctx.undo.push({
      label: 'Rename property',
      forward: () => renamePropertyDef(newName),
      inverse: () => renamePropertyDef(prevName)
    })
    ctx.requestRender()
  }

  function collectVariantOptions(componentSetId: string): Map<string, Set<string>> {
    const node = ctx.graph.getNode(componentSetId)
    if (node?.type !== 'COMPONENT_SET') return new Map()
    const options = new Map<string, Set<string>>()
    for (const childId of node.childIds) {
      const child = ctx.graph.getNode(childId)
      if (child?.type !== 'COMPONENT') continue
      for (const [key, value] of Object.entries(child.componentPropertyValues)) {
        const set = options.get(key) ?? new Set()
        set.add(value)
        options.set(key, set)
      }
    }
    return options
  }

  function getComponentSetVariants(componentSetId: string): SceneNode[] {
    const node = ctx.graph.getNode(componentSetId)
    if (node?.type !== 'COMPONENT_SET') return []
    return node.childIds
      .map((id) => ctx.graph.getNode(id))
      .filter((child): child is SceneNode => child?.type === 'COMPONENT')
  }

  function findVariantByValues(
    componentSetId: string,
    values: Record<string, string>
  ): SceneNode | undefined {
    for (const child of getComponentSetVariants(componentSetId).sort(sortByCanvasPosition)) {
      const childValues = child.componentPropertyValues
      const matches = Object.entries(values).every(([k, v]) => childValues[k] === v)
      if (matches) return child
    }
    return undefined
  }

  function getDefaultVariantForComponentSet(componentSetId: string): SceneNode | undefined {
    const node = ctx.graph.getNode(componentSetId)
    if (node?.type !== 'COMPONENT_SET') return undefined

    const defaultValues = Object.fromEntries(
      node.componentPropertyDefinitions
        .filter((def) => def.type === 'VARIANT' && def.defaultValue)
        .map((def) => [def.name, def.defaultValue])
    )
    if (Object.keys(defaultValues).length > 0) {
      const explicitDefault = findVariantByValues(componentSetId, defaultValues)
      if (explicitDefault) return explicitDefault
    }

    return getComponentSetVariants(componentSetId).sort(sortByCanvasPosition)[0]
  }

  function getComponentSetVariantConflicts(componentSetId: string): VariantConflict[] {
    const node = ctx.graph.getNode(componentSetId)
    if (node?.type !== 'COMPONENT_SET') return []

    const propNames = node.componentPropertyDefinitions
      .filter((def) => def.type === 'VARIANT')
      .map((def) => def.name)
    const byKey = new Map<string, { values: Record<string, string>; componentIds: string[] }>()

    for (const variant of getComponentSetVariants(componentSetId)) {
      const values = Object.fromEntries(
        propNames.map((name) => [name, variant.componentPropertyValues[name] ?? ''])
      )
      const key = propNames.map((name) => `${name}=${values[name]}`).join('\u0000')
      const entry = byKey.get(key) ?? { values, componentIds: [] }
      entry.componentIds.push(variant.id)
      byKey.set(key, entry)
    }

    return [...byKey.values()].filter((entry) => entry.componentIds.length > 1)
  }

  /**
   * Change one property value on a variant child ("Current variant" editor):
   * updates the child's values and derived name, extending the property's
   * option list when the value is new.
   */
  function setVariantPropertyValue(componentId: string, propertyName: string, value: string) {
    const child = ctx.graph.getNode(componentId)
    if (child?.type !== 'COMPONENT') return
    const set = child.parentId ? ctx.graph.getNode(child.parentId) : null
    if (set?.type !== 'COMPONENT_SET') return

    const prev = {
      values: { ...child.componentPropertyValues },
      name: child.name,
      defs: structuredClone(set.componentPropertyDefinitions)
    }
    const nextValues = { ...child.componentPropertyValues, [propertyName]: value }
    const orderedNames = set.componentPropertyDefinitions
      .filter((d) => d.type === 'VARIANT')
      .map((d) => d.name)
    const nextName = orderedNames.map((n) => nextValues[n] ?? '').join(', ')
    const nextDefs = set.componentPropertyDefinitions.map((d) =>
      d.type === 'VARIANT' && d.name === propertyName
        ? { ...d, variantOptions: [...new Set([...(d.variantOptions ?? []), value])] }
        : d
    )

    const apply = (
      values: Record<string, string>,
      name: string,
      defs: ComponentPropertyDefinition[]
    ) => {
      ctx.graph.updateNode(componentId, { componentPropertyValues: values, name })
      ctx.graph.updateNode(set.id, { componentPropertyDefinitions: structuredClone(defs) })
      ctx.requestRender()
    }
    apply(nextValues, nextName, nextDefs)
    ctx.undo.push({
      label: 'Change variant value',
      forward: () => apply(nextValues, nextName, nextDefs),
      inverse: () => apply(prev.values, prev.name, prev.defs)
    })
  }

  /**
   * Figma's "Add variant": duplicate the set's default variant below the
   * existing ones with a fresh value for the first VARIANT property. Creates
   * that property (assigning values to existing variants) when the set has
   * none yet.
   */
  function addVariantToSet(componentSetId: string): string | null {
    const set = ctx.graph.getNode(componentSetId)
    if (set?.type !== 'COMPONENT_SET') return null
    const variants = getComponentSetVariants(componentSetId)
    const source = getDefaultVariantForComponentSet(componentSetId) ?? variants.at(-1)
    if (!source) return null

    const prevSelection = new Set(ctx.state.selectedIds)
    const prevDefs = structuredClone(set.componentPropertyDefinitions)
    const prevSize = { width: set.width, height: set.height }
    const prevChildValues = new Map(
      variants.map((v) => [v.id, { values: { ...v.componentPropertyValues }, name: v.name }])
    )

    const defs = structuredClone(set.componentPropertyDefinitions)
    let variantDef = defs.find((def) => def.type === 'VARIANT')
    const values = new Map(variants.map((v) => [v.id, { ...v.componentPropertyValues }]))
    if (!variantDef) {
      variantDef = {
        id: `prop:${randomHex(8)}`,
        name: 'Variant',
        type: 'VARIANT',
        defaultValue: '',
        variantOptions: []
      }
      defs.push(variantDef)
      variants.forEach((child, index) => {
        const value = index === 0 ? 'Default' : `Variant ${index + 1}`
        values.set(child.id, { ...values.get(child.id), [variantDef!.name]: value })
      })
    }

    const used = new Set([...values.values()].map((v) => v[variantDef.name]))
    let counter = variants.length + 1
    while (used.has(`Variant ${counter}`)) counter++
    const newValue = `Variant ${counter}`

    const newValues = { ...values.get(source.id), [variantDef.name]: newValue }
    const orderedNames = defs.filter((d) => d.type === 'VARIANT').map((d) => d.name)
    const nameFor = (vals: Record<string, string>) =>
      orderedNames.map((n) => vals[n] ?? '').join(', ')

    const bottom = Math.max(...variants.map((v) => v.y + v.height))
    const clone = ctx.graph.cloneTree(source.id, componentSetId, {
      x: source.x,
      y: bottom + 20,
      name: nameFor(newValues),
      componentPropertyValues: newValues
    })
    if (!clone) return null

    variantDef.variantOptions = [...new Set([...(variantDef.variantOptions ?? []), ...used, newValue])]
    if (!variantDef.defaultValue) variantDef.defaultValue = values.get(variants[0]?.id ?? '')?.[variantDef.name] ?? newValue

    const applyMutations = () => {
      for (const [childId, vals] of values) {
        ctx.graph.updateNode(childId, { componentPropertyValues: vals, name: nameFor(vals) })
      }
      ctx.graph.updateNode(componentSetId, {
        componentPropertyDefinitions: structuredClone(defs),
        width: Math.max(prevSize.width, clone.x + clone.width + 20),
        height: Math.max(prevSize.height, clone.y + clone.height + 20)
      })
    }
    const revertMutations = () => {
      for (const [childId, prev] of prevChildValues) {
        ctx.graph.updateNode(childId, { componentPropertyValues: prev.values, name: prev.name })
      }
      ctx.graph.updateNode(componentSetId, {
        componentPropertyDefinitions: structuredClone(prevDefs),
        width: prevSize.width,
        height: prevSize.height
      })
    }
    applyMutations()
    ctx.setSelectedIds(new Set([clone.id]))

    const cloneSnapshot = snapshotSubtree(ctx.graph, clone.id)
    ctx.undo.push({
      label: 'Add variant',
      forward: () => {
        const root = cloneSnapshot.get(clone.id)
        if (root) restoreSubtree(ctx.graph, root, componentSetId, cloneSnapshot)
        applyMutations()
        ctx.setSelectedIds(new Set([clone.id]))
        ctx.requestRender()
      },
      inverse: () => {
        ctx.graph.deleteNode(clone.id)
        revertMutations()
        ctx.setSelectedIds(prevSelection)
        ctx.requestRender()
      }
    })
    ctx.requestRender()
    return clone.id
  }

  function switchInstanceVariant(instanceId: string, propertyName: string, newValue: string) {
    const instance = ctx.graph.getNode(instanceId)
    if (instance?.type !== 'INSTANCE' || !instance.componentId) return

    const component = ctx.graph.getNode(instance.componentId)
    if (!component) return
    const componentSetId = component.parentId
    if (!componentSetId) return
    const componentSet = ctx.graph.getNode(componentSetId)
    if (componentSet?.type !== 'COMPONENT_SET') return

    const currentValues = { ...component.componentPropertyValues }
    currentValues[propertyName] = newValue
    const target = findVariantByValues(componentSetId, currentValues)
    if (!target || target.id === instance.componentId) return

    const prevComponentId = instance.componentId
    ctx.graph.swapInstanceComponent(instanceId, target.id)
    reapplyInstanceComponentProperties(ctx, instanceId)
    ctx.undo.push({
      label: 'Switch variant',
      forward: () => {
        ctx.graph.swapInstanceComponent(instanceId, target.id)
        reapplyInstanceComponentProperties(ctx, instanceId)
        ctx.requestRender()
      },
      inverse: () => {
        ctx.graph.swapInstanceComponent(instanceId, prevComponentId)
        reapplyInstanceComponentProperties(ctx, instanceId)
        ctx.requestRender()
      }
    })
    ctx.requestRender()
  }

  return {
    getComponentSetPropertyDefs,
    addPropertyDefinition,
    removePropertyDefinition,
    renamePropertyDefinition,
    parseVariantName,
    buildVariantName,
    collectVariantOptions,
    findVariantByValues,
    getDefaultVariantForComponentSet,
    getComponentSetVariantConflicts,
    getComponentSetVariants,
    addVariantToSet,
    setVariantPropertyValue,
    switchInstanceVariant
  }
}
