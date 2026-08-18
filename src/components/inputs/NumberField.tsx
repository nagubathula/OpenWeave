import React, { useMemo } from 'react'
import { tv } from 'tailwind-variants'

import {
  NumberFieldRoot,
  NumberFieldInput,
  NumberFieldValue,
  useNumberField
} from '@openweave/react'

import theme from '@/theme/number-field'

export interface NumberFieldProps {
  value: number | symbol
  min?: number
  max?: number
  step?: number
  icon?: React.ReactNode
  label?: string
  suffix?: string
  sensitivity?: number
  placeholder?: string
  disabled?: boolean
  bound?: boolean
  onChange: (value: number) => void
  onCommit?: (value: number, previous: number) => void
  onEditingChange?: (editing: boolean) => void
  className?: string; dataTestId?: string
  ariaLabel?: string
  dataProperty?: string
}

export default function NumberField({
  value,
  min,
  max,
  step,
  icon,
  label,
  suffix,
  sensitivity,
  placeholder,
  disabled,
  bound,
  onChange,
  onCommit,
  onEditingChange,
  className,
  dataTestId,
  ariaLabel,
  dataProperty
}: NumberFieldProps) {
  const styles = useMemo(() => tv(theme)({ suffix: Boolean(suffix) }), [suffix])

  const accessibleLabel = ariaLabel ?? label ?? (typeof icon === 'string' ? icon : undefined)

  return (
    <NumberFieldRoot
      modelValue={value as any}
      min={min}
      max={max}
      step={step}
      sensitivity={sensitivity}
      placeholder={placeholder}
      ariaLabel={accessibleLabel}
      disabled={disabled}
      bound={bound}
      onModelValueChange={onChange}
      onCommit={onCommit}
      onEditingChange={onEditingChange}
    >
      <NumberFieldInner
        styles={styles}
        icon={icon}
        label={label}
        suffix={suffix}
        placeholder={placeholder}
        className={className}
        dataProperty={dataProperty}
        dataTestId={dataTestId}
      />
    </NumberFieldRoot>
  )
}

function NumberFieldInner({
  styles,
  icon,
  label,
  suffix,
  placeholder,
  className,
  dataTestId,
  dataProperty
}: any) {
  const { editing, actions, rootAttrs, stateAttrs } = useNumberField()

  return (
    <div
      {...rootAttrs}
      {...stateAttrs}
      data-slot="root"
      data-property={dataProperty} data-test-id={dataTestId}
      className={styles.root({ class: className })}
      onPointerDown={(e) => {
        if (!editing && !(e.target as HTMLElement).closest('button')) {
          actions.startScrub(e)
        }
      }}
    >
      <span className={styles.leading()}>
        {icon && <span className="text-[11px] leading-none flex items-center">{icon}</span>}
        {label && <span className="text-[11px] leading-none">{label}</span>}
      </span>
      <NumberFieldInput className={styles.field()} />
      {/* Suffix during editing? */}
      <NumberFieldValue className={styles.display()}>
        {({ displayValue, isMixed }: any) => {
          if (isMixed) {
            return <span className={styles.mixed()}>{placeholder ?? 'Mixed'}</span>
          }
          return (
            <>
              <span className={styles.value()}>{displayValue}</span>
              {suffix && <span className={styles.suffix()}>{suffix}</span>}
            </>
          )
        }}
      </NumberFieldValue>
    </div>
  )
}
