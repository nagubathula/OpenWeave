import React, { useEffect, useRef, useState } from 'react'
import * as Popover from '@radix-ui/react-popover'
import { Check, Diamond, Plus, Unlink } from 'lucide-react'

import { useBindableValue } from '@openweave/react'

import Tip from '@/components/ui/Tip'
import { BindingTrigger, useBindingFieldUI } from '@/components/ui/binding'
import type { BindingFieldUI } from '@/components/ui/binding'

export interface VariableBindingPickerProps {
  triggerLabel: string
  searchPlaceholder: string
  emptyLabel: string
  detachLabel: string
  createLabel?: string
  createNamePlaceholder?: string
  createSubmitLabel?: string
  createDefaultName?: string
  disabled?: boolean
  derived?: boolean
  ui?: BindingFieldUI
}

/**
 * Variable picker for bindable fields. Must be rendered inside a
 * BindableValueRoot; renders the diamond trigger plus a popover with search,
 * the variable list, detach, and an inline create-variable form.
 */
export default function VariableBindingPicker({
  triggerLabel,
  searchPlaceholder,
  emptyLabel,
  detachLabel,
  createLabel,
  createNamePlaceholder = 'Variable name',
  createSubmitLabel = 'Create',
  createDefaultName = '',
  disabled = false,
  derived = false,
  ui
}: VariableBindingPickerProps) {
  const binding = useBindableValue<unknown>()
  const [creating, setCreating] = useState(false)
  const [createName, setCreateName] = useState('')
  const searchInput = useRef<HTMLInputElement | null>(null)
  const createInput = useRef<HTMLInputElement | null>(null)
  const canCreate = createName.trim().length > 0
  const styles = useBindingFieldUI(
    { state: binding.state, open: binding.open, disabled, derived },
    ui
  )

  const { open, actions } = binding
  const setSearchTerm = actions.setSearchTerm

  // Reset transient picker state whenever the popover closes.
  useEffect(() => {
    if (open) return
    setCreating(false)
    setSearchTerm('')
  }, [open, setSearchTerm])

  function startCreate() {
    setCreating(true)
    setCreateName(createDefaultName)
    requestAnimationFrame(() => {
      createInput.current?.focus()
      createInput.current?.select()
    })
  }

  function submitCreate(event: React.FormEvent) {
    event.preventDefault()
    const name = createName.trim()
    if (!name) return
    binding.actions.create(name)
  }

  function detach() {
    binding.actions.unbind()
    binding.actions.closePicker()
  }

  return (
    <Popover.Root
      open={binding.open}
      onOpenChange={(next) => (next ? binding.actions.openPicker() : binding.actions.closePicker())}
    >
      <span className="inline-flex shrink-0 items-center" data-slot="anchor">
        <Tip label={triggerLabel}>
          <Popover.Trigger asChild>
            <BindingTrigger
              label={triggerLabel}
              state={binding.state}
              open={binding.open}
              disabled={disabled}
              derived={derived}
              ui={ui}
            />
          </Popover.Trigger>
        </Tip>
      </span>

      <Popover.Portal>
        <Popover.Content
          side="left"
          align="center"
          sideOffset={8}
          collisionPadding={8}
          className={styles.pickerContent}
          data-slot="content"
          onOpenAutoFocus={(event) => {
            event.preventDefault()
            searchInput.current?.focus()
          }}
          onEscapeKeyDown={(event) => {
            if (!creating) return
            event.preventDefault()
            setCreating(false)
          }}
        >
          <input
            ref={searchInput}
            value={binding.searchTerm}
            placeholder={searchPlaceholder}
            className={styles.pickerSearch}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            data-slot="search"
            onChange={(event) => binding.actions.setSearchTerm(event.target.value)}
          />
          <div className={styles.pickerViewport} data-slot="viewport">
            {binding.variables.length === 0 && (
              <div className={styles.pickerEmpty} data-slot="empty">
                {emptyLabel}
              </div>
            )}
            {binding.variables.map((variable) => (
              <button
                key={variable.id}
                type="button"
                className={`${styles.pickerItem} w-full border-0 bg-transparent text-left hover:bg-hover`}
                data-slot="item"
                onClick={() => binding.actions.bind(variable.id)}
              >
                <Diamond className={styles.pickerItemIcon} data-slot="itemIcon" />
                <span className={styles.pickerItemLabel} data-slot="itemLabel">
                  {variable.name}
                </span>
                {binding.variable?.id === variable.id && (
                  <span className={styles.pickerItemIndicator} data-slot="itemIndicator">
                    <Check className="size-3" />
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className={styles.pickerFooter} data-slot="footer">
            {binding.state === 'bound' && (
              <button type="button" className={styles.pickerAction} data-slot="action" onClick={detach}>
                <Unlink className="size-3" />
                <span>{detachLabel}</span>
              </button>
            )}

            {creating ? (
              <form className={styles.createForm} data-slot="createForm" onSubmit={submitCreate}>
                <input
                  ref={createInput}
                  value={createName}
                  placeholder={createNamePlaceholder}
                  className={styles.createInput}
                  data-slot="createInput"
                  onChange={(event) => setCreateName(event.target.value)}
                />
                <button
                  disabled={!canCreate}
                  className={styles.createSubmit}
                  data-slot="createSubmit"
                  type="submit"
                >
                  {createSubmitLabel}
                </button>
              </form>
            ) : (
              createLabel && (
                <button
                  type="button"
                  className={styles.pickerAction}
                  data-slot="action"
                  onClick={startCreate}
                >
                  <Plus className="size-3" />
                  <span className="min-w-0 flex-1 truncate">{createLabel}</span>
                </button>
              )
            )}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
