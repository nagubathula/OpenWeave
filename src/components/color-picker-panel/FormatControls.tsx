import React from 'react'
import type { ColorFieldFormat } from '@openweave/react'

import { useColorPickerPanelContext } from './context'
import RgbFields from './RgbFields'
import HslFields from './HslFields'
import HsbFields from './HsbFields'
import OkhclFields from './OkhclFields'

export function FormatControls() {
  const ctx = useColorPickerPanelContext()

  return (
    <div className="flex flex-col gap-2">
      <select
        className="w-[120px] rounded border border-border bg-input px-2 py-1 text-xs text-surface outline-none"
        data-test-id="color-format-select"
        aria-label="Color format"
        value={ctx.format}
        onChange={(event) => ctx.setFormat(event.target.value as ColorFieldFormat)}
      >
        {ctx.fieldOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      <div className="flex min-w-0 flex-col gap-2">
        {ctx.format === 'rgb' ? (
          <RgbFields />
        ) : ctx.format === 'hsl' ? (
          <HslFields />
        ) : ctx.format === 'hsb' ? (
          <HsbFields />
        ) : (
          <OkhclFields />
        )}
      </div>
    </div>
  )
}

export default FormatControls
