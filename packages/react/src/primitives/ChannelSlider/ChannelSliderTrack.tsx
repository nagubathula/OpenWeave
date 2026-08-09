import React, { type ElementType, type ReactNode } from 'react'
import * as Slider from '@radix-ui/react-slider'

import { useChannelSlider } from './context'
import type { ChannelSliderPartProps } from './types'

export function ChannelSliderTrack({
  as: Component = 'span',
  asChild = false,
  children,
  ...props
}: ChannelSliderPartProps & Omit<React.HTMLAttributes<HTMLSpanElement>, 'children'>) {
  const ctx = useChannelSlider()

  const renderedChildren = typeof children === 'function' ? children(ctx.slotProps) : children

  return (
    <Slider.Track
      asChild={asChild}
      data-slot="track"
      {...(props as any)}
    >
      {!asChild && Component !== 'span' ? (
        <Component>{renderedChildren}</Component>
      ) : (
        renderedChildren
      )}
    </Slider.Track>
  )
}

export default ChannelSliderTrack
