import React, { useMemo } from 'react'

import { BindableValueRoot, useI18n, useNumberBindingProvider } from '@openweave/react'
import type { NumberBindingPath } from '@openweave/react'

import NumberField from '@/components/inputs/NumberField'
import VariableBindingPicker from '@/components/properties/binding/VariableBindingPicker'
import { BindingPill } from '@/components/ui/binding'

export interface VariableNumberFieldProps {
  value: number
  min?: number
  max?: number
  suffix?: string
  icon?: React.ReactNode
  ariaLabel?: string
  nodeId: string
  bindingPath: NumberBindingPath
  onChange: (value: number) => void
  onCommit: (value: number, previous: number) => void
  /** Extra control rendered after the variable-binding trigger (e.g. a sizing or gap-mode menu). */
  trailing?: React.ReactNode
  className?: string
  dataTestId?: string
}

/**
 * Numeric field with variable-binding support, used for layout properties
 * (gap, padding, size). Mirrors the old Vue VariableNumberField: wraps the
 * plain NumberField in a BindableValueRoot, swaps the value display for a
 * BindingPill when a variable is bound, and always exposes the variable
 * picker trigger. `data-property` is set for E2E/property-panel targeting,
 * matching the old app's convention.
 */
export default function VariableNumberField({
  value,
  min,
  max,
  suffix,
  icon,
  ariaLabel,
  nodeId,
  bindingPath,
  onChange,
  onCommit,
  trailing,
  className,
  dataTestId
}: VariableNumberFieldProps) {
  const { panels, dialogs } = useI18n()
  const provider = useNumberBindingProvider()
  const targets = useMemo(() => [{ nodeId, path: bindingPath }], [nodeId, bindingPath])

  return (
    <div
      className={`flex min-w-0 items-center gap-1${className ? ` ${className}` : ''}`}
      data-test-id={dataTestId}
      data-property={bindingPath}
    >
      <BindableValueRoot
        provider={provider}
        targets={targets}
        value={value}
        batchLabel={`Change ${bindingPath}`}
      >
        {(binding) => (
          <>
            <div className="flex min-w-0 flex-1 items-center">
              {binding.state === 'bound' && binding.variable ? (
                <div className="flex h-6 min-w-0 flex-1 items-center gap-1.5 rounded border border-border bg-input/50 px-1.5">
                  {icon && (
                    <span className="flex shrink-0 items-center text-[11px] text-muted">
                      {icon}
                    </span>
                  )}
                  <BindingPill
                    className="min-w-0 flex-1"
                    label={binding.variable.name}
                    tooltip={
                      typeof binding.resolvedValue === 'number'
                        ? `${binding.variable.name} · ${Math.round(binding.resolvedValue)}${suffix ?? ''}`
                        : binding.variable.name
                    }
                  />
                </div>
              ) : (
                <NumberField
                  className="w-full"
                  icon={icon}
                  ariaLabel={ariaLabel}
                  value={value}
                  min={min}
                  max={max}
                  suffix={suffix}
                  onChange={onChange}
                  onCommit={onCommit}
                />
              )}
            </div>
            <VariableBindingPicker
              triggerLabel={panels.applyVariable}
              searchPlaceholder={dialogs.search}
              emptyLabel={panels.noVariablesFound}
              detachLabel={panels.detachVariable}
              createLabel={panels.createNumberVariable({ value: Math.round(value) })}
              createNamePlaceholder={panels.variableName}
              createSubmitLabel={panels.create}
            />
          </>
        )}
      </BindableValueRoot>
      {trailing}
    </div>
  )
}
