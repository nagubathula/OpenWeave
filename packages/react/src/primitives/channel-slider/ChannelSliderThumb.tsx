import React, { type ReactNode } from 'react'
import * as Slider from '@radix-ui/react-slider'

import { useChannelSlider } from './context'
import type { ChannelSliderPartProps, ChannelSliderThumbSlotProps } from './types'

export interface ChannelSliderThumbProps extends Omit<ChannelSliderPartProps, 'children'> {
  children?: ReactNode | ((props: ChannelSliderThumbSlotProps) => ReactNode)
}

export function ChannelSliderThumb({
  as: Component = 'span',
  asChild = false,
  children,
  ...props
}: ChannelSliderThumbProps & Omit<React.HTMLAttributes<HTMLSpanElement>, 'children'>) {
  const ctx = useChannelSlider()

  const renderedChildren = typeof children === 'function' ? children(ctx.thumbSlotProps) : children

  return (
    <Slider.Thumb
      asChild={asChild}
      data-slot="thumb"
      aria-label={ctx.label}
      aria-valuetext={ctx.valueText}
      {...(props as any)}
    >
      {!asChild && Component !== 'span' ? (
        <Component>{renderedChildren}</Component>
      ) : (
        renderedChildren
      )}
    </Slider.Thumb>
  )
}

export default ChannelSliderThumb
