import { useTypography, type TypographyFontLoader } from '#react/controls/typography/use'
import React from 'react'

export interface TypographyControlsRootProps {
  fontLoader?: TypographyFontLoader
  children?: React.ReactNode | ((props: any) => React.ReactNode)
}

export function TypographyControlsRoot({ fontLoader, children }: TypographyControlsRootProps) {
  const ctx = useTypography({ fontLoader })

  function onAlignChange(val: string) {
    if (val) ctx.setAlign(val as 'LEFT' | 'CENTER' | 'RIGHT' | 'JUSTIFIED')
  }

  function onFormattingChange(val: string | string[]) {
    if (Array.isArray(val)) ctx.onFormattingChange(val)
  }

  const actions = {
    setFamily: ctx.setFamily,
    setWeight: ctx.setWeight,
    setDirection: ctx.setDirection,
    setVerticalAlign: ctx.setVerticalAlign,
    setTextCase: ctx.setTextCase,
    setTruncation: ctx.setTruncation,
    setFontFeature: ctx.setFontFeature,
    updateProp: ctx.updateProp,
    commitProp: ctx.commitProp,
    align: onAlignChange,
    formatting: onFormattingChange,
    toggleBold: ctx.toggleBold,
    toggleItalic: ctx.toggleItalic,
    toggleDecoration: ctx.toggleDecoration
  }

  const renderedChildren =
    typeof children === 'function'
      ? children({
          node: ctx.node,
          weights: ctx.weights,
          missingFonts: ctx.missingFonts,
          hasMissingFonts: ctx.hasMissingFonts,
          activeFormatting: ctx.activeFormatting,
          actions
        })
      : children

  return <>{renderedChildren}</>
}

export default TypographyControlsRoot
