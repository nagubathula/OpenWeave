import React from 'react'

import {
  useEditor,
  useSceneComputed,
  useSelectionState,
  useI18n,
  BindableValueRoot,
  useStringBindingProvider,
  useBooleanBindingProvider
} from '@openweave/react'
import { booleanVariantPair, instanceSwapOptions } from '@openweave/react'
import type { SceneNode, ComponentPropertyDefinition } from '@openweave/scene-graph'

import VariableBindingPicker from '@/components/properties/binding/VariableBindingPicker'
import ComponentSlotPicker from '@/components/properties/ComponentSlotPicker'
import { AppSelect } from '@/components/ui/AppSelect'
import { AppSwitch } from '@/components/ui/AppSwitch'
import { BindingPill } from '@/components/ui/binding'
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

interface NestedGroup {
  id: string
  name: string
  controls: PropertyControl[]
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
 * undo step. With a single instance selected, exposed nested instances render
 * their own property groups below (Figma's expose-properties).
 */
export default function ComponentPropertiesSection() {
  const editor = useEditor()
  const { selectedIds } = useSelectionState()
  const { panels, dialogs } = useI18n()
  const stringProvider = useStringBindingProvider()
  const booleanProvider = useBooleanBindingProvider()

  const instances = useSceneComputed<SceneNode[]>(() => {
    void editor.state.sceneVersion
    return [...selectedIds]
      .map((id) => editor.graph.getNode(id))
      .filter((n): n is SceneNode => n?.type === 'INSTANCE')
  })
  const allInstances = instances.length > 0 && instances.length === selectedIds.size
  const node = allInstances ? instances[0] : null

  const buildControls = React.useCallback(
    (targets: SceneNode[]): PropertyControl[] => {
      const first = targets[0]
      if (!first) return []
      const definitions = editor.getInstanceComponentPropertyDefinitions(first.id)
      const component = first.componentId ? editor.graph.getNode(first.componentId) : null
      const parent = component?.parentId ? editor.graph.getNode(component.parentId) : null
      const variantValues =
        parent?.type === 'COMPONENT_SET' ? editor.collectVariantOptions(parent.id) : null
      const allNodes: SceneNode[] = [...editor.graph.getAllNodes()]

      return definitions.map((definition) => {
        const values = targets.map((instance) =>
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
          overridden: targets.some(
            (instance) => definition.id in instance.componentPropertyAssignments
          )
        }
      })
    },
    [editor]
  )

  const controls = useSceneComputed<PropertyControl[]>(() => {
    if (!node) return []
    return buildControls(instances)
  })

  // Exposed nested instances (single-instance selection only): each renders
  // its own property group, edits landing on the nested instance itself.
  const nestedGroups = useSceneComputed<NestedGroup[]>(() => {
    void editor.state.sceneVersion
    if (!node || instances.length !== 1) return []
    return editor
      .getExposedNestedInstances(node.id)
      .map(({ id, name }) => {
        const nested = editor.graph.getNode(id)
        return nested ? { id, name, controls: buildControls([nested]) } : null
      })
      .filter((group): group is NestedGroup => group !== null && group.controls.length > 0)
  })

  if (!node || (controls.length === 0 && nestedGroups.length === 0)) return null

  const setValueOn = (targets: SceneNode[], control: PropertyControl, value: string) => {
    const label = `Change ${control.name}`
    const apply = () => {
      for (const instance of targets)
        editor.setInstanceComponentProperty(instance.id, control.id, value)
    }
    if (targets.length > 1) editor.undo.runBatch(label, apply)
    else apply()
  }

  const renderControl = (
    control: PropertyControl,
    targets: SceneNode[],
    onValueChange: (value: string) => void
  ): React.ReactNode => {
    // Figma parity: a variant property whose two values form a boolean
    // pair (True/False, Yes/No, On/Off) renders as a toggle, not a
    // dropdown.
    const variantToggle = control.type === 'VARIANT' ? booleanVariantPair(control.options) : null

    // Convert targets into the format expected by BindableValueRoot
    const bindingTargets = targets.map((t) => ({
      nodeId: t.id,
      path: `componentPropertyAssignments:${control.id}`
    }))
    const bindingProvider =
      control.type === 'TEXT' ? stringProvider : control.type === 'BOOLEAN' ? booleanProvider : null
    const isBindable = bindingProvider !== null

    const controlContent = (
      <div key={control.id} className="flex min-w-0 flex-1 items-center gap-2 text-xs">
        <Tip label={control.overridden ? `${control.name} — ${panels.hasOverrides}` : control.name}>
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
        {isBindable ? (
          <BindableValueRoot
            provider={bindingProvider as any}
            targets={bindingTargets}
            value={control.type === 'BOOLEAN' ? control.value === 'true' : control.value}
            batchLabel={`Change ${control.name}`}
          >
            {(binding) => (
              <>
                <div className="flex min-w-0 flex-1 items-center">
                  {binding.state === 'bound' && binding.variable ? (
                    <div className="flex h-6 min-w-0 flex-1 items-center rounded border border-border bg-input/50 px-1.5">
                      <BindingPill
                        className="min-w-0 flex-1"
                        label={binding.variable.name}
                        tooltip={binding.variable.name}
                      />
                    </div>
                  ) : control.type === 'BOOLEAN' ? (
                    <AppSwitch
                      label={control.name}
                      state={control.mixed ? 'mixed' : 'idle'}
                      value={control.value === 'true'}
                      onValueChange={(checked) => onValueChange(checked ? 'true' : 'false')}
                    />
                  ) : (
                    <div className={boxCls + ' flex-1'}>
                      <input
                        type="text"
                        aria-label={control.name}
                        className={inputCls}
                        value={control.value}
                        onChange={(e) => onValueChange(e.target.value)}
                      />
                    </div>
                  )}
                </div>
                <VariableBindingPicker
                  triggerLabel={panels.applyVariable}
                  searchPlaceholder={dialogs.search}
                  emptyLabel={panels.noVariablesFound}
                  detachLabel={panels.detachVariable}
                  createLabel={
                    control.type === 'TEXT'
                      ? panels.createStringVariable({
                          value:
                            control.value.length > 20
                              ? `${control.value.slice(0, 20)}…`
                              : control.value
                        })
                      : panels.createVariable
                  }
                  createNamePlaceholder={panels.variableName}
                  createSubmitLabel={panels.create}
                />
              </>
            )}
          </BindableValueRoot>
        ) : variantToggle ? (
          <AppSwitch
            label={control.name}
            state={control.mixed ? 'mixed' : 'idle'}
            value={
              variantToggle
                ? control.value.trim().toLowerCase() === variantToggle.on.trim().toLowerCase()
                : control.value === 'true'
            }
            onValueChange={(checked) =>
              onValueChange(
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
        ) : control.type === 'INSTANCE_SWAP' ? (
          <ComponentSlotPicker
            label={control.name}
            value={control.value}
            onValueChange={onValueChange}
          />
        ) : (
          <div className="flex-1 min-w-0">
            <AppSelect
              label={control.name}
              options={
                control.options.length > 0
                  ? control.options
                  : [{ value: control.value, label: control.value }]
              }
              value={control.value}
              onValueChange={onValueChange}
            />
          </div>
        )}
      </div>
    )
    return controlContent
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
      {controls.map((control) =>
        renderControl(control, instances, (value) => setValueOn(instances, control, value))
      )}
      {nestedGroups.map((group) => (
        <div key={group.id} className="space-y-2" data-test-id="exposed-instance-group">
          <div className="truncate text-[10px] font-medium text-muted">{group.name}</div>
          {group.controls.map((control) =>
            renderControl(
              control,
              group.id ? [editor.graph.getNode(group.id)!].filter(Boolean) : [],
              (value) => {
                const nested = editor.graph.getNode(group.id)
                if (nested) setValueOn([nested], control, value)
              }
            )
          )}
        </div>
      ))}
    </section>
  )
}
