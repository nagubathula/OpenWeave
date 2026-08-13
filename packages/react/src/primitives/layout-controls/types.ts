import type { useLayout } from '#react/controls/layout/use'

type LayoutContext = ReturnType<typeof useLayout>

type LayoutActionKey =
  | 'updateProp'
  | 'updateSizeLimit'
  | 'setSizeLimitToCurrent'
  | 'commitSizeLimit'
  | 'addSizeLimit'
  | 'removeSizeLimit'
  | 'commitProp'
  | 'setAxisSizing'
  | 'updateAxisSize'
  | 'commitAxisSize'
  | 'setHorizontalPadding'
  | 'commitHorizontalPadding'
  | 'setVerticalPadding'
  | 'commitVerticalPadding'
  | 'setAlignment'
  | 'setGapAuto'
  | 'setLayoutDirection'
  | 'updateGridTrack'
  | 'addTrack'
  | 'removeTrack'
  | 'toggleIndividualPadding'

export type LayoutControlsRootSlotProps = Omit<LayoutContext, LayoutActionKey> & {
  actions: Pick<LayoutContext, LayoutActionKey>
}
