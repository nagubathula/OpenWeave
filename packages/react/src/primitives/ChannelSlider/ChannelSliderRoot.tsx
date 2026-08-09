import React, { useMemo, useCallback } from 'react'
import * as Slider from '@radix-ui/react-slider'

import { ChannelSliderProvider } from './context'
import type {
  ChannelSliderContext,
  ChannelSliderRootProps,
  ChannelSliderRootSlotProps,
  ChannelSliderThumbSlotProps
} from './types'

export function ChannelSliderRoot({
  modelValue,
  label,
  as = 'span',
  asChild = false,
  min = 0,
  max = 100,
  step = 1,
  orientation = 'horizontal',
  disabled = false,
  inverted = false,
  formatValueText = String,
  onModelValueChange,
  onValueCommit,
  children,
  ...props
}: ChannelSliderRootProps & Omit<React.HTMLAttributes<HTMLSpanElement>, 'children' | 'defaultValue'>) {
  const valueText = useMemo(() => formatValueText(modelValue), [formatValueText, modelValue])

  const slotProps = useMemo<ChannelSliderRootSlotProps>(() => ({
    value: modelValue,
    min,
    max,
    step,
    disabled,
    orientation
  }), [modelValue, min, max, step, disabled, orientation])

  const thumbSlotProps = useMemo<ChannelSliderThumbSlotProps>(() => ({
    value: modelValue,
    valueText,
    label
  }), [modelValue, valueText, label])

  const contextValue = useMemo<ChannelSliderContext>(() => ({
    value: modelValue,
    label,
    valueText,
    min,
    max,
    step,
    disabled,
    orientation,
    slotProps,
    thumbSlotProps
  }), [modelValue, label, valueText, min, max, step, disabled, orientation, slotProps, thumbSlotProps])

  const onValueChange = useCallback((values: number[]) => {
    onModelValueChange?.(values[0] ?? min)
  }, [min, onModelValueChange])

  const commit = useCallback((values: number[]) => {
    onValueCommit?.(values[0] ?? min)
  }, [min, onValueCommit])

  const renderedChildren = typeof children === 'function' ? children(slotProps) : children

  return (
    <ChannelSliderProvider value={contextValue}>
      <Slider.Root
        value={[modelValue]}
        onValueChange={onValueChange}
        onValueCommit={commit}
        min={min}
        max={max}
        step={step}
        orientation={orientation}
        disabled={disabled}
        inverted={inverted}
        asChild={asChild}
        data-slot="root"
        {...(props as any)}
      >
        {renderedChildren}
      </Slider.Root>
    </ChannelSliderProvider>
  )
}

export default ChannelSliderRoot
