import React from 'react'

import { useEditor, useSceneComputed, useSelectionState, useI18n } from '@openweave/react'
import { booleanVariantPair, instanceSwapOptions } from '@openweave/react'
import type { SceneNode, ComponentPropertyDefinition } from '@openweave/scene-graph'

import { AppSelect } from '@/components/ui/AppSelect'
import { AppSwitch } from '@/components/ui/AppSwitch'
import Tip from '@/components/ui/Tip'

interface PropertyControl {
  id: string
  name: string
  type: ComponentPropertyDefinition['type']
  value: string
  mixed: boolean
  options: { value: string; label: string }[]
  overridden: boolean
}

const inputCls = 'w-full bg-transparent outline-none text-surface'
const boxCls =
  'flex items-center gap-1.5 bg-input/50 rounded px-2 py-1 border border-border text-xs'

/**
 * Variant and property controls for the selected component instance(s). Shown
 * only when every selected node is an INSTANCE. Renders a dropdown per
 * VARIANT and INSTANCE_SWAP property, a switch for BOOLEAN, and a text field
 * for TEXT. With a multi-instance selection, values that differ across
 * instances are flagged `mixed` and edits batch across all of them as one
 * undo step.
 */
export default function ComponentPropertiesSection() {
  const editor = useEditor()
  const { selectedIds } = useSelectionState()
  const { panels } = useI18n()

  const instances = useSceneComputed<SceneNode[]>(() => {
    void editor.state.sceneVersion
    return [...selectedIds]
      .map((id) => editor.graph.getNode(id))
      .filter((n): n is SceneNode => n?.type === 'INSTANCE')
  })
  const allInstances = instances.length > 0 && instances.length === selectedIds.size
  const node = allInstances ? instances[0] : null

  const controls = useSceneComputed<PropertyControl[]>(() => {
    if (!node) return []
    const definitions = editor.getInstanceComponentPropertyDefinitions(node.id)
    const component = node.componentId ? editor.graph.getNode(node.componentId) : null
    const parent = component?.parentId ? editor.graph.getNode(component.parentId) : null
    const variantValues =
      parent?.type === 'COMPONENT_SET' ? editor.collectVariantOptions(parent.id) : null
    const allNodes: SceneNode[] = [...editor.graph.getAllNodes()]

    return definitions.map((definition) => {
      const values = instances.map((instance) =>
        editor.getInstanceComponentPropertyValue(instance.id, definition)
      )
      const value = values[0] ?? definition.defaultValue
      const mixed = values.some((v) => v !== value)
      let options: { value: string; label: string }[] = []
      if (definition.type === 'VARIANT') {
        const values = variantValues?.get(definition.name)
        options = [...(values ?? [])].map((v) => ({ value: v, label: v }))
      } else if (definition.type === 'INSTANCE_SWAP') {
        options = instanceSwapOptions(allNodes, definition, value).map((o) => ({
          value: o.value,
          label: o.label
        }))
      }
      return {
        id: definition.id,
        name: definition.name,
        type: definition.type,
        value,
        mixed,
        options,
        // Overridden = at least one selected instance carries an explicit
        // assignment for this property (vs. inheriting the default).
        overridden: instances.some(
          (instance) => definition.id in instance.componentPropertyAssignments
        )
      }
    })
  })

  if (!node || controls.length === 0) return null

  const setValue = (control: PropertyControl, value: string) => {
    const label = `Change ${control.name}`
    const apply = () => {
      for (const instance of instances)
        editor.setInstanceComponentProperty(instance.id, control.id, value)
    }
    if (instances.length > 1) editor.undo.runBatch(label, apply)
    else apply()
  }

  const sectionLabel = controls.every((control) => control.type === 'VARIANT')
    ? panels.variants
    : panels.componentProperties

  return (
    <section
      aria-label={sectionLabel}
      className="space-y-2 border-b border-border pb-3"
      data-test-id="component-properties-section"
    >
      <div className="text-[11px] font-semibold text-muted uppercase tracking-wider">
        Properties
      </div>
      {controls.map((control) => {
        // Figma parity: a variant property whose two values form a boolean
        // pair (True/False, Yes/No, On/Off) renders as a toggle, not a
        // dropdown.
        const variantToggle =
          control.type === 'VARIANT' ? booleanVariantPair(control.options) : null
        return (
          <div key={control.id} className="flex items-center gap-2 text-xs">
            <Tip
              label={control.overridden ? `${control.name} — ${panels.hasOverrides}` : control.name}
            >
              <span className="flex w-16 shrink-0 items-center gap-1 truncate text-muted text-[11px]">
                {control.overridden && (
                  <span
                    data-test-id="property-override-dot"
                    className="size-1.5 shrink-0 rounded-full bg-component"
                    aria-hidden="true"
                  />
                )}
                {control.name}
              </span>
            </Tip>
            {control.type === 'BOOLEAN' || variantToggle ? (
              <AppSwitch
                label={control.name}
                state={control.mixed ? 'mixed' : 'idle'}
                value={
                  variantToggle
                    ? control.value.trim().toLowerCase() === variantToggle.on.trim().toLowerCase()
                    : control.value === 'true'
                }
                onValueChange={(checked) =>
                  setValue(
                    control,
                    variantToggle
                      ? checked
                        ? variantToggle.on
                        : variantToggle.off
                      : checked
                        ? 'true'
                        : 'false'
                  )
                }
              />
            ) : control.type === 'TEXT' ? (
              <div className={boxCls + ' flex-1'}>
                <input
                  type="text"
                  aria-label={control.name}
                  className={inputCls}
                  value={control.value}
                  onChange={(e) => setValue(control, e.target.value)}
                />
              </div>
            ) : (
              <div className="flex-1">
                <AppSelect
                  label={control.name}
                  options={
                    control.options.length > 0
                      ? control.options
                      : [{ value: control.value, label: control.value }]
                  }
                  value={control.value}
                  onValueChange={(value) => setValue(control, value)}
                />
              </div>
            )}
          </div>
        )
      })}
    </section>
  )
}
