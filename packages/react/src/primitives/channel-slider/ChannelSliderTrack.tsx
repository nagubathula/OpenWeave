import * as Slider from '@radix-ui/react-slider'
import React, { type ReactNode } from 'react'

import { useChannelSlider } from './context'
import type { ChannelSliderPartProps, ChannelSliderRootSlotProps } from './types'

export function ChannelSliderTrack({
  as: Component = 'span',
  asChild = false,
  children,
  ...props
}: Omit<ChannelSliderPartProps, 'children'> &
  Omit<React.HTMLAttributes<HTMLSpanElement>, 'children'> & {
    children?: ReactNode | ((props: ChannelSliderRootSlotProps) => ReactNode)
  }) {
  const ctx = useChannelSlider()

  const renderedChildren = typeof children === 'function' ? children(ctx.slotProps) : children

  return (
    <Slider.Track asChild={asChild} data-slot="track" {...(props as any)}>
      {!asChild && Component !== 'span' ? (
        <Component>{renderedChildren}</Component>
      ) : (
        renderedChildren
      )}
    </Slider.Track>
  )
}

export default ChannelSliderTrack
