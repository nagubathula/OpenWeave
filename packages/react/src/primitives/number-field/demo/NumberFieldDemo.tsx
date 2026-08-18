import { MIXED } from '#react/controls/node-props/use'
import { NumberFieldInput } from '#react/primitives/number-field/NumberFieldInput'
import { NumberFieldRoot } from '#react/primitives/number-field/NumberFieldRoot'
import { NumberFieldValue } from '#react/primitives/number-field/NumberFieldValue'
import {
  NumberFieldLeading,
  NumberFieldMenu,
  NumberFieldTrailing,
  NumberFieldUnit
} from '#react/primitives/number-field/parts'
import React, { useState } from 'react'

const fieldClass =
  'flex h-[26px] min-w-0 items-center overflow-hidden rounded border border-transparent bg-[var(--vp-c-bg-alt)] px-2 text-xs outline-none focus-within:border-[var(--vp-c-brand-1)]'

export function NumberFieldDemo() {
  const [value, setValue] = useState<number | symbol>(24)
  const [mixed, setMixed] = useState<number | symbol>(MIXED)
  const [disabled, setDisabled] = useState<number | symbol>(16)
  const [bound, setBound] = useState<number | symbol>(8)

  return (
    <div className="w-full max-w-[520px] rounded-lg border border-[var(--vp-c-divider)] bg-[var(--vp-c-bg-soft)] p-5 text-[var(--vp-c-text-1)]">
      <div>
        <p className="mb-1 text-xs font-semibold">Interactive anatomy</p>
        <p className="mb-2 text-[11px] text-[var(--vp-c-text-2)]">Try +10, *2, 50%, or 12*8+4</p>
        <NumberFieldRoot
          modelValue={value}
          onModelValueChange={setValue}
          min={0}
          max={200}
          step={2}
          ariaLabel="Interactive number field"
        >
          {({ attrs, editing, actions }) => (
            <div
              {...attrs}
              data-story-control
              className="flex h-[26px] w-56 items-center overflow-hidden rounded border border-transparent bg-[var(--vp-c-bg-alt)] text-xs outline-none focus-within:border-[var(--vp-c-brand-1)]"
              onPointerDown={(event) => {
                if (!editing) actions.startScrub(event)
              }}
            >
              <NumberFieldLeading className="px-2 text-[var(--vp-c-text-2)]">W</NumberFieldLeading>
              <NumberFieldInput
                data-test-id="interactive-number-input"
                className="min-w-0 flex-1 border-0 bg-transparent outline-none"
              />
              <NumberFieldValue className="min-w-0 flex-1 truncate" />
              <NumberFieldUnit className="pr-1 text-[var(--vp-c-text-2)]">px</NumberFieldUnit>
              <NumberFieldTrailing className="flex size-[26px] items-center justify-center text-[var(--vp-c-text-2)]">
                R
              </NumberFieldTrailing>
              <NumberFieldMenu className="flex size-[26px] items-center justify-center text-[var(--vp-c-text-2)]">
                M
              </NumberFieldMenu>
            </div>
          )}
        </NumberFieldRoot>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-1.5 sm:grid-cols-3">
        <div>
          <p className="mb-1 text-[11px] text-[var(--vp-c-text-2)]">Mixed</p>
          <NumberFieldRoot
            modelValue={mixed}
            onModelValueChange={setMixed}
            ariaLabel="Mixed number field"
          >
            {({ attrs, editing, actions }) => (
              <div
                {...attrs}
                className={fieldClass}
                onPointerDown={(event) => {
                  if (!editing) actions.startScrub(event)
                }}
              >
                <NumberFieldInput className="min-w-0 flex-1 border-0 bg-transparent outline-none" />
                <NumberFieldValue className="text-[var(--vp-c-text-2)]" />
              </div>
            )}
          </NumberFieldRoot>
        </div>

        <div>
          <p className="mb-1 text-[11px] text-[var(--vp-c-text-2)]">Disabled</p>
          <NumberFieldRoot
            modelValue={disabled}
            onModelValueChange={setDisabled}
            ariaLabel="Disabled number field"
            disabled
          >
            {({ attrs }) => (
              <div
                {...attrs}
                className="flex h-[26px] min-w-0 items-center overflow-hidden rounded border border-transparent bg-[var(--vp-c-bg-alt)] px-2 text-xs text-[var(--vp-c-text-2)] opacity-60"
              >
                <NumberFieldValue />
              </div>
            )}
          </NumberFieldRoot>
        </div>

        <div>
          <p className="mb-1 text-[11px] text-[var(--vp-c-text-2)]">Bound</p>
          <NumberFieldRoot
            modelValue={bound}
            onModelValueChange={setBound}
            ariaLabel="Bound number field"
            bound
          >
            {({ attrs, editing, actions }) => (
              <div
                {...attrs}
                className="flex h-[26px] min-w-0 items-center overflow-hidden rounded border border-transparent bg-[var(--vp-c-bg-alt)] px-2 text-xs text-[var(--vp-c-brand-1)] outline-none focus-within:border-[var(--vp-c-brand-1)]"
                onPointerDown={(event) => {
                  if (!editing) actions.startScrub(event)
                }}
              >
                <NumberFieldInput className="min-w-0 flex-1 border-0 bg-transparent outline-none" />
                <NumberFieldValue />
                <NumberFieldUnit className="ml-1">gap/md</NumberFieldUnit>
              </div>
            )}
          </NumberFieldRoot>
        </div>
      </div>
    </div>
  )
}

export default NumberFieldDemo
