import { MIXED, type MixedValue } from '#react/controls/node-props/helpers'

import type {
  ComponentPropertyDefinition,
  ComponentPropertyType,
  SceneNode
} from '@openweave/scene-graph'

export interface ComponentPropertyOption {
  value: string
  label: string
  missing?: boolean
}

export interface ComponentPropertyControl {
  id: string
  name: string
  type: ComponentPropertyType
  value: MixedValue<string>
  options: ComponentPropertyOption[]
}

export function compatibleComponentPropertyDefinitions(
  definitions: ComponentPropertyDefinition[][]
): ComponentPropertyDefinition[] {
  if (definitions.length === 0) return []
  const first = definitions[0]
  const signature = (items: ComponentPropertyDefinition[]) =>
    items.map((item) => `${item.id}:${item.type}`).join('\u0000')
  const expected = signature(first)
  return definitions.every((items) => signature(items) === expected) ? first : []
}

export function mergedComponentPropertyValue(values: string[]): MixedValue<string> {
  const first = values[0] ?? ''
  return values.every((value) => value === first) ? first : MIXED
}

const BOOLEAN_VARIANT_PAIRS: Array<[on: string, off: string]> = [
  ['true', 'false'],
  ['yes', 'no'],
  ['on', 'off']
]

/**
 * Figma renders a variant property whose two values form a boolean-like pair
 * (True/False, Yes/No, On/Off — any casing, either order) as a toggle switch
 * instead of a dropdown. Returns the pair's on/off option values, else null.
 */
export function booleanVariantPair(
  options: ComponentPropertyOption[]
): { on: string; off: string } | null {
  if (options.length !== 2) return null
  const [first, second] = options
  const a = first.value.trim().toLowerCase()
  const b = second.value.trim().toLowerCase()
  for (const [on, off] of BOOLEAN_VARIANT_PAIRS) {
    if (a === on && b === off) return { on: first.value, off: second.value }
    if (a === off && b === on) return { on: second.value, off: first.value }
  }
  return null
}

export function instanceSwapOptions(
  components: SceneNode[],
  definition: ComponentPropertyDefinition,
  value: string
): ComponentPropertyOption[] {
  const preferred = new Set(definition.preferredValues)
  const options: ComponentPropertyOption[] = components
    .filter((node) => node.type === 'COMPONENT')
    .map((node) => ({
      value: node.id,
      label: node.name,
      // Published components match by key; locally-authored allow-lists
      // store node ids.
      preferred:
        preferred.has(node.componentKey ?? '') ||
        preferred.has(node.sourceLibraryKey ?? '') ||
        preferred.has(node.id)
    }))
    .sort(
      (left, right) =>
        Number(right.preferred) - Number(left.preferred) || left.label.localeCompare(right.label)
    )
    .map(({ value: optionValue, label }) => ({ value: optionValue, label }))
  if (value && !options.some((option) => option.value === value)) {
    options.push({ value, label: value, missing: true })
  }
  return options
}
