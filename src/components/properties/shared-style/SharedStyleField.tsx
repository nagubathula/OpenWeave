import * as Popover from '@radix-ui/react-popover'
import { Plus } from 'lucide-react'
import React, { useState } from 'react'

import { MIXED, useI18n, useSharedStyleBinding } from '@openweave/react'
import type { SharedStyleKind } from '@openweave/scene-graph'

import { AppSelect } from '@/components/ui/AppSelect'
import { PanelFieldGroup, PanelGrid } from '@/components/ui/panel'
import Tip from '@/components/ui/Tip'

export interface SharedStyleFieldProps {
  kind: SharedStyleKind
  label: string
}

/**
 * Apply/detach selector for shared styles. Shows Mixed when the
 * selection diverges and a "missing style" entry when the referenced style no
 * longer exists. Also allows creating a new shared style from the active selection.
 */
export default function SharedStyleField({ kind, label }: SharedStyleFieldProps) {
  const { panels } = useI18n()
  const binding = useSharedStyleBinding(kind)
  const { active, styleId, styles } = binding
  const [createOpen, setCreateOpen] = useState(false)
  const [styleName, setStyleName] = useState('')

  if (!active) return null

  const options: Array<{ value: string; label: string }> = [{ value: 'NONE', label: panels.none }]
  if (styleId === MIXED) options.unshift({ value: 'MIXED', label: panels.mixed })
  for (const style of styles) options.push({ value: style.id, label: style.name })
  if (typeof styleId === 'string' && !styles.some((style) => style.id === styleId)) {
    options.push({ value: styleId, label: panels.missingStyle({ id: styleId }) })
  }

  const value = styleId === MIXED ? 'MIXED' : typeof styleId === 'string' ? styleId : 'NONE'

  function update(next: string) {
    if (next === 'MIXED') return
    if (next === 'NONE') binding.unbind()
    else binding.bind(next)
  }

  function handleCreate(e?: React.FormEvent) {
    e?.preventDefault()
    const trimmed = styleName.trim()
    const defaultName = `${label.replace(/ Style$/i, '')} ${styles.length + 1}`
    binding.createStyle(trimmed || defaultName)
    setStyleName('')
    setCreateOpen(false)
  }

  return (
    <PanelGrid className="mb-1.5">
      <PanelFieldGroup label={label} data-property={`${kind}-style`}>
        <div className="flex items-center gap-1 w-full">
          <div className="flex-1 min-w-0">
            <AppSelect value={value} options={options} label={label} onValueChange={update} />
          </div>
          <Popover.Root open={createOpen} onOpenChange={setCreateOpen}>
            <Popover.Trigger asChild>
              <Tip label={`Create ${label.toLowerCase()} from selection`}>
                <button
                  type="button"
                  data-slot="create-style-trigger"
                  aria-label={`Create ${label.toLowerCase()} from selection`}
                  className="flex size-6 shrink-0 items-center justify-center rounded border border-border bg-input/40 text-muted hover:border-border-strong hover:bg-hover hover:text-foreground focus-visible:ring-1 focus-visible:ring-accent transition-colors"
                >
                  <Plus className="size-3.5" />
                </button>
              </Tip>
            </Popover.Trigger>
            <Popover.Portal>
              <Popover.Content
                side="left"
                align="center"
                sideOffset={8}
                data-slot="create-style-popover"
                className="z-50 w-60 rounded-lg border border-border bg-panel p-3 shadow-xl text-xs space-y-2.5 outline-none"
              >
                <form onSubmit={handleCreate} className="space-y-2.5">
                  <div className="font-semibold text-surface">Create {label}</div>
                  <input
                    type="text"
                    value={styleName}
                    onChange={(e) => setStyleName(e.target.value)}
                    placeholder={`${label.replace(/ Style$/i, '')} ${styles.length + 1}`}
                    autoFocus
                    className="w-full h-7 rounded border border-border bg-input/50 px-2 text-xs text-surface placeholder:text-muted focus:border-accent focus:outline-none"
                  />
                  <div className="flex justify-end gap-1.5">
                    <button
                      type="button"
                      onClick={() => setCreateOpen(false)}
                      className="h-6 px-2 rounded text-muted hover:text-foreground hover:bg-hover transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="h-6 px-2.5 rounded bg-accent text-accent-foreground font-medium hover:bg-accent/90 transition-colors"
                    >
                      Create
                    </button>
                  </div>
                </form>
              </Popover.Content>
            </Popover.Portal>
          </Popover.Root>
        </div>
      </PanelFieldGroup>
    </PanelGrid>
  )
}
