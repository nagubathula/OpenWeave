import React, { useMemo, useRef, useState } from 'react'

import type { Variable } from '@openweave/scene-graph'

import type {
  BindingProvider,
  BindingState,
  BindingTarget
} from '#react/controls/binding-provider/types'
import { BindableValuePicker } from '#react/primitives/bindable-value/BindableValuePicker'
import { BindableValueRoot } from '#react/primitives/bindable-value/BindableValueRoot'
import { BindableValueTrigger } from '#react/primitives/bindable-value/BindableValueTrigger'
import { NumberFieldInput } from '#react/primitives/number-field/NumberFieldInput'
import { NumberFieldRoot } from '#react/primitives/number-field/NumberFieldRoot'
import { NumberFieldValue } from '#react/primitives/number-field/NumberFieldValue'

const detachTarget: BindingTarget[] = [{ nodeId: 'detach', path: 'width' }]
const readonlyTarget: BindingTarget[] = [{ nodeId: 'readonly', path: 'width' }]
const editVariableTarget: BindingTarget[] = [{ nodeId: 'edit-variable', path: 'width' }]
const mixedTargets: BindingTarget[] = [
  { nodeId: 'mixed-a', path: 'width' },
  { nodeId: 'mixed-b', path: 'width' }
]
const pickerTarget: BindingTarget[] = [{ nodeId: 'picker', path: 'width' }]

const fieldClass =
  'flex h-[26px] items-center rounded bg-[var(--vp-c-bg-alt)] px-2 text-xs data-[bound]:text-[var(--vp-c-brand-1)]'

function targetKey(target: BindingTarget) {
  return `${target.nodeId}:${target.path}`
}

function initialVariables(): Variable[] {
  return [
    {
      id: 'space/md',
      name: 'Space/md',
      type: 'FLOAT',
      collectionId: 'demo',
      valuesByMode: { default: 16 },
      description: '',
      hiddenFromPublishing: false
    },
    {
      id: 'space/lg',
      name: 'Space/lg',
      type: 'FLOAT',
      collectionId: 'demo',
      valuesByMode: { default: 24 },
      description: '',
      hiddenFromPublishing: false
    }
  ]
}

export function BindableValueDemo() {
  const [detachValue, setDetachValue] = useState<number | symbol>(8)
  const [readonlyValue, setReadonlyValue] = useState<number | symbol>(8)
  const [editVariableValue, setEditVariableValue] = useState<number | symbol>(8)
  const [pickerValue] = useState<number | symbol>(12)

  // The provider mutates in place; `revision` re-renders the tree, which is what the
  // React SDK expects in place of Vue's reactive provider.
  const [revision, setRevision] = useState(0)
  const variablesRef = useRef<Variable[]>(initialVariables())
  const bindingsRef = useRef<Record<string, string | undefined>>({
    'detach:width': 'space/md',
    'readonly:width': 'space/lg',
    'edit-variable:width': 'space/md',
    'mixed-a:width': 'space/md',
    'mixed-b:width': 'space/lg'
  })

  const provider = useMemo<BindingProvider<number>>(() => {
    const bump = () => setRevision((current) => current + 1)
    return {
      revision,
      listVariables: () => variablesRef.current,
      filterVariables: (term) =>
        variablesRef.current.filter((variable) =>
          variable.name.toLowerCase().includes(term.toLowerCase())
        ),
      getBound: (target) =>
        variablesRef.current.find(
          (variable) => variable.id === bindingsRef.current[targetKey(target)]
        ),
      getState(targets): BindingState {
        const ids = new Set(targets.map((target) => bindingsRef.current[targetKey(target)]))
        if (ids.size > 1) return 'mixed'
        return ids.has(undefined) ? 'unbound' : 'bound'
      },
      resolve: (variableId) =>
        variablesRef.current.find((variable) => variable.id === variableId)?.valuesByMode
          .default as number | undefined,
      bind(target, variableId) {
        bindingsRef.current[targetKey(target)] = variableId
        bump()
      },
      unbind(target) {
        bindingsRef.current[targetKey(target)] = undefined
        bump()
      },
      setValue(variableId, value) {
        const variable = variablesRef.current.find((item) => item.id === variableId)
        if (variable) variable.valuesByMode.default = value
        bump()
      },
      create(target, value, name) {
        const id = `created:${name}`
        variablesRef.current.push({
          id,
          name,
          type: 'FLOAT',
          collectionId: 'demo',
          valuesByMode: { default: value },
          description: '',
          hiddenFromPublishing: false
        })
        bindingsRef.current[targetKey(target)] = id
        bump()
      }
    }
  }, [revision])

  return (
    <div className="w-full max-w-[560px] space-y-5 rounded-lg border border-[var(--vp-c-divider)] bg-[var(--vp-c-bg-soft)] p-5 text-[var(--vp-c-text-1)]">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <p className="mb-1 text-[11px] text-[var(--vp-c-text-2)]">Detach on edit</p>
          <BindableValueRoot provider={provider} targets={detachTarget} value={detachValue}>
            {({ stateAttrs }) => (
              <NumberFieldRoot
                modelValue={detachValue}
                onModelValueChange={setDetachValue}
                ariaLabel="Detach bound value"
              >
                {({ attrs, editing, actions }) => (
                  <div
                    {...attrs}
                    {...stateAttrs}
                    className={fieldClass}
                    onPointerDown={(event) => {
                      if (!editing) actions.startScrub(event)
                    }}
                  >
                    <NumberFieldInput className="min-w-0 flex-1 bg-transparent outline-none" />
                    <NumberFieldValue />
                  </div>
                )}
              </NumberFieldRoot>
            )}
          </BindableValueRoot>
        </div>

        <div>
          <p className="mb-1 text-[11px] text-[var(--vp-c-text-2)]">Read-only bound</p>
          <BindableValueRoot
            provider={provider}
            targets={readonlyTarget}
            value={readonlyValue}
            policy="readonly-when-bound"
          >
            {({ stateAttrs }) => (
              <NumberFieldRoot
                modelValue={readonlyValue}
                onModelValueChange={setReadonlyValue}
                ariaLabel="Readonly bound value"
              >
                {({ attrs, editing, actions }) => (
                  <div
                    {...attrs}
                    {...stateAttrs}
                    className={fieldClass}
                    onPointerDown={(event) => {
                      if (!editing) actions.startScrub(event)
                    }}
                  >
                    <NumberFieldInput className="min-w-0 flex-1 bg-transparent outline-none" />
                    <NumberFieldValue />
                  </div>
                )}
              </NumberFieldRoot>
            )}
          </BindableValueRoot>
        </div>

        <div>
          <p className="mb-1 text-[11px] text-[var(--vp-c-text-2)]">Edit variable</p>
          <BindableValueRoot
            provider={provider}
            targets={editVariableTarget}
            value={editVariableValue}
            policy="edit-variable"
          >
            {({ stateAttrs }) => (
              <NumberFieldRoot
                modelValue={editVariableValue}
                onModelValueChange={setEditVariableValue}
                ariaLabel="Edit bound variable"
              >
                {({ attrs, editing, actions }) => (
                  <div
                    {...attrs}
                    {...stateAttrs}
                    className={fieldClass}
                    onPointerDown={(event) => {
                      if (!editing) actions.startScrub(event)
                    }}
                  >
                    <NumberFieldInput className="min-w-0 flex-1 bg-transparent outline-none" />
                    <NumberFieldValue />
                  </div>
                )}
              </NumberFieldRoot>
            )}
          </BindableValueRoot>
        </div>

        <div>
          <p className="mb-1 text-[11px] text-[var(--vp-c-text-2)]">Mixed bindings</p>
          <BindableValueRoot provider={provider} targets={mixedTargets} value={0}>
            {({ state, stateAttrs }) => (
              <div
                {...stateAttrs}
                className="flex h-[26px] items-center rounded bg-[var(--vp-c-bg-alt)] px-2 text-xs text-[var(--vp-c-text-2)]"
                aria-label="Mixed binding value"
              >
                {state}
              </div>
            )}
          </BindableValueRoot>
        </div>
      </div>

      <BindableValueRoot provider={provider} targets={pickerTarget} value={pickerValue}>
        {({ open, stateAttrs }) => (
          <div {...stateAttrs} className="relative">
            <BindableValueTrigger
              className="rounded bg-[var(--vp-c-bg-alt)] px-2 py-1 text-xs"
              aria-label="Choose binding"
            >
              Choose variable
            </BindableValueTrigger>
            {open && (
              <BindableValuePicker>
                {({ variables: options, actions }) => (
                  <div className="absolute top-full left-0 z-10 mt-1 w-40 rounded border border-[var(--vp-c-divider)] bg-[var(--vp-c-bg-soft)] p-1">
                    {options.map((option) => (
                      <button
                        key={option.id}
                        className="block w-full rounded px-2 py-1 text-left text-xs hover:bg-[var(--vp-c-bg-alt)]"
                        type="button"
                        onClick={() => actions.bind(option.id)}
                      >
                        {option.name}
                      </button>
                    ))}
                  </div>
                )}
              </BindableValuePicker>
            )}
          </div>
        )}
      </BindableValueRoot>
    </div>
  )
}

export default BindableValueDemo
