import { useLayout } from '#react/controls/layout/use'
import { LayoutControlsProvider } from '#react/primitives/layout-controls/context'
import type { LayoutControlsRootSlotProps } from '#react/primitives/layout-controls/types'
import React, { useMemo } from 'react'

export interface LayoutControlsRootProps {
  children?: React.ReactNode | ((props: LayoutControlsRootSlotProps) => React.ReactNode)
}

export function LayoutControlsRoot({ children }: LayoutControlsRootProps) {
  const ctx = useLayout()

  const actions = useMemo(
    () => ({
      updateProp: ctx.updateProp,
      updateSizeLimit: ctx.updateSizeLimit,
      setSizeLimitToCurrent: ctx.setSizeLimitToCurrent,
      commitSizeLimit: ctx.commitSizeLimit,
      addSizeLimit: ctx.addSizeLimit,
      removeSizeLimit: ctx.removeSizeLimit,
      commitProp: ctx.commitProp,
      setAxisSizing: ctx.setAxisSizing,
      updateAxisSize: ctx.updateAxisSize,
      commitAxisSize: ctx.commitAxisSize,
      setHorizontalPadding: ctx.setHorizontalPadding,
      commitHorizontalPadding: ctx.commitHorizontalPadding,
      setVerticalPadding: ctx.setVerticalPadding,
      commitVerticalPadding: ctx.commitVerticalPadding,
      setAlignment: ctx.setAlignment,
      setGapAuto: ctx.setGapAuto,
      setLayoutDirection: ctx.setLayoutDirection,
      updateGridTrack: ctx.updateGridTrack,
      addTrack: ctx.addTrack,
      removeTrack: ctx.removeTrack,
      toggleIndividualPadding: ctx.toggleIndividualPadding
    }),
    [
      ctx.updateProp,
      ctx.updateSizeLimit,
      ctx.setSizeLimitToCurrent,
      ctx.commitSizeLimit,
      ctx.addSizeLimit,
      ctx.removeSizeLimit,
      ctx.commitProp,
      ctx.setAxisSizing,
      ctx.updateAxisSize,
      ctx.commitAxisSize,
      ctx.setHorizontalPadding,
      ctx.commitHorizontalPadding,
      ctx.setVerticalPadding,
      ctx.commitVerticalPadding,
      ctx.setAlignment,
      ctx.setGapAuto,
      ctx.setLayoutDirection,
      ctx.updateGridTrack,
      ctx.addTrack,
      ctx.removeTrack,
      ctx.toggleIndividualPadding
    ]
  )

  const contextValue = useMemo(() => {
    if (!ctx.node) return null
    return { ...ctx, node: ctx.node }
  }, [ctx])

  if (!contextValue) return null

  const renderedChildren =
    typeof children === 'function'
      ? children({
          editor: ctx.editor,
          node: ctx.node,
          layoutDirection: ctx.layoutDirection,
          gapAuto: ctx.gapAuto,
          isInAutoLayout: ctx.isInAutoLayout,
          isGrid: ctx.isGrid,
          isFlex: ctx.isFlex,
          widthSizing: ctx.widthSizing,
          heightSizing: ctx.heightSizing,
          widthSizingOptions: ctx.widthSizingOptions,
          heightSizingOptions: ctx.heightSizingOptions,
          alignGrid: ctx.alignGrid,
          showIndividualPadding: ctx.showIndividualPadding,
          hasUniformPadding: ctx.hasUniformPadding,
          hasSymmetricPadding: ctx.hasSymmetricPadding,
          trackSizingOptions: ctx.trackSizingOptions,
          trackLabel: ctx.trackLabel,
          actions
        })
      : children

  return <LayoutControlsProvider value={contextValue}>{renderedChildren}</LayoutControlsProvider>
}

export default LayoutControlsRoot
