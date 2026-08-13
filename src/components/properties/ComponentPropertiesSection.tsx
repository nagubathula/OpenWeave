import React from 'react'
import { useEditor, useSceneComputed, useSelectionState } from '@openweave/react'
import { instanceSwapOptions } from '@openweave/react'
import type { SceneNode, ComponentPropertyDefinition } from '@openweave/scene-graph'

interface PropertyControl {
  id: string
  name: string
  type: ComponentPropertyDefinition['type']
  value: string
  options: { value: string; label: string }[]
}

const inputCls = 'w-full bg-transparent outline-none text-surface'
const boxCls = 'flex items-center gap-1.5 bg-input/50 rounded px-2 py-1 border border-border text-xs'

/**
 * Variant and property controls for a selected component instance. Shown only
 * when the active node is an INSTANCE. Renders a dropdown per VARIANT and
 * INSTANCE_SWAP property, a checkbox for BOOLEAN, and a text field for TEXT.
 */
export default function ComponentPropertiesSection() {
  const editor = useEditor()
  const { selectedNode: node } = useSelectionState()

  const controls = useSceneComputed<PropertyControl[]>(() => {
    if (!node || node.type !== 'INSTANCE') return []
    const definitions = editor.getInstanceComponentPropertyDefinitions(node.id)
    const component = node.componentId ? editor.graph.getNode(node.componentId) : null
    const parent = component?.parentId ? editor.graph.getNode(component.parentId) : null
    const variantValues =
      parent?.type === 'COMPONENT_SET' ? editor.collectVariantOptions(parent.id) : null
    const allNodes: SceneNode[] = [...editor.graph.getAllNodes()]

    return definitions.map((definition) => {
      const value = editor.getInstanceComponentPropertyValue(node.id, definition)
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
      return { id: definition.id, name: definition.name, type: definition.type, value, options }
    })
  })

  if (!node || node.type !== 'INSTANCE' || controls.length === 0) return null

  const setValue = (control: PropertyControl, value: string) => {
    editor.setInstanceComponentProperty(node.id, control.id, value)
  }

  return (
    <div className="space-y-2 border-b border-border pb-3" data-test-id="component-properties-section">
      <div className="text-[11px] font-semibold text-muted uppercase tracking-wider">Properties</div>
      {controls.map((control) => (
        <div key={control.id} className="flex items-center gap-2 text-xs">
          <span className="w-16 shrink-0 truncate text-muted text-[11px]" title={control.name}>
            {control.name}
          </span>
          {control.type === 'BOOLEAN' ? (
            <input
              type="checkbox"
              checked={control.value === 'true'}
              onChange={(e) => setValue(control, e.target.checked ? 'true' : 'false')}
            />
          ) : (control.type === 'TEXT' ? (
            <div className={boxCls + ' flex-1'}>
              <input
                type="text"
                className={inputCls}
                value={control.value}
                onChange={(e) => setValue(control, e.target.value)}
              />
            </div>
          ) : (
            <div className={boxCls + ' flex-1'}>
              <select
                className={inputCls}
                value={control.value}
                onChange={(e) => setValue(control, e.target.value)}
              >
                {control.options.length === 0 && <option value={control.value}>{control.value}</option>}
                {control.options.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
