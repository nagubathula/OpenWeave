import React, { useMemo } from 'react'
import { tv } from 'tailwind-variants'
import { ChannelSliderRoot, ChannelSliderThumb, ChannelSliderTrack } from '@openweave/react'

import NumberField from '@/components/inputs/NumberField'
import theme from '@/theme/color-slider'

export interface ColorSliderFieldProps {
  label: string
  /** Raw slider value, on whatever internal scale the channel uses. */
  value: number
  min: number
  max: number
  step?: number
  /** Value shown (and edited) in the adjacent numeric field -- may use a
   * different scale than `value` (e.g. OkHCL chroma is stored 0-0.4 but
   * displayed as a 0-40% field). */
  displayValue: number
  displayMin: number
  displayMax: number
  displayStep?: number
  suffix?: string
  /** CSS `background` value for the track (gradient, etc). */
  gradient: string
  checkerboard?: boolean
  /** CSS `background` value for the thumb -- shows a live color preview. */
  thumbFill: string
  formatValueText?: (value: number) => string
  onValueChange: (value: number) => void
  onDisplayChange: (value: number) => void
  'data-test-id'?: string
}

/**
 * One labeled slider row: an accessible `ChannelSliderRoot` (role=slider,
 * arrow-key stepping, ARIA value text) paired with a numeric field. Used for
 * every channel slider in the panel -- hue, alpha, HSL/HSB saturation &
 * lightness/brightness, and all four OkHCL channels -- since none of them
 * have a color-space-aware track to fall back on in React the way reka-ui's
 * `ColorSliderRoot` did in the old Vue implementation; the gradient is always
 * supplied explicitly instead.
 */
export function ColorSliderField({
  label,
  value,
  min,
  max,
  step = 1,
  displayValue,
  displayMin,
  displayMax,
  displayStep = 1,
  suffix,
  gradient,
  checkerboard = false,
  thumbFill,
  formatValueText,
  onValueChange,
  onDisplayChange,
  'data-test-id': dataTestId
}: ColorSliderFieldProps) {
  const styles = useMemo(() => tv(theme)({ checkerboard }), [checkerboard])

  return (
    <div className={styles.root()}>
      <span className={styles.label()}>{label}</span>
      <ChannelSliderRoot
        className={styles.slider()}
        modelValue={value}
        label={label}
        min={min}
        max={max}
        step={step}
        formatValueText={formatValueText}
        onModelValueChange={onValueChange}
        data-test-id={dataTestId}
      >
        <ChannelSliderTrack className={styles.track()} style={{ background: gradient }} />
        <ChannelSliderThumb className={styles.thumb()} style={{ background: thumbFill }} />
      </ChannelSliderRoot>
      <NumberField
        className={styles.input()}
        ariaLabel={label}
        value={displayValue}
        min={displayMin}
        max={displayMax}
        step={displayStep}
        suffix={suffix}
        onChange={onDisplayChange}
      />
    </div>
  )
}

export default ColorSliderField
