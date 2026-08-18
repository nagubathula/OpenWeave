import React from 'react'

import { MIXED, useI18n, useSharedStyleBinding } from '@openweave/react'
import type { SharedStyleKind } from '@openweave/scene-graph'

import { AppSelect } from '@/components/ui/AppSelect'
import { PanelFieldGroup, PanelGrid } from '@/components/ui/panel'

export interface SharedStyleFieldProps {
  kind: SharedStyleKind
  label: string
}

/**
 * Apply/detach selector for shared styles. Hidden until at least one style of
 * the kind exists or the selection references one; shows Mixed when the
 * selection diverges and a "missing style" entry when the referenced style no
 * longer exists. Editing the underlying property detaches the style
 * automatically via the editor core.
 */
export default function SharedStyleField({ kind, label }: SharedStyleFieldProps) {
  const { panels } = useI18n()
  const binding = useSharedStyleBinding(kind)
  const { active, styleId, styles } = binding
  const visible = active && (styles.length > 0 || styleId === MIXED || styleId !== null)

  if (!visible) return null

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

  return (
    <PanelGrid className="mb-1.5">
      <PanelFieldGroup label={label} data-property={`${kind}-style`}>
        <AppSelect value={value} options={options} label={label} onValueChange={update} />
      </PanelFieldGroup>
    </PanelGrid>
  )
}
