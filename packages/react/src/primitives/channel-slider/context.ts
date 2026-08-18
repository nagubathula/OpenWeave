import { createContext, useContext } from 'react'

import type { ChannelSliderContext } from './types'

const ChannelSliderReactContext = createContext<ChannelSliderContext | null>(null)

export function useChannelSlider(): ChannelSliderContext {
  const context = useContext(ChannelSliderReactContext)
  if (!context) {
    throw new Error('[openweave] ChannelSlider part must be used inside ChannelSliderRoot')
  }
  return context
}

export const ChannelSliderProvider = ChannelSliderReactContext.Provider
