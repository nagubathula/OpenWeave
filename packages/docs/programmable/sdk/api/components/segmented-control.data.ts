import { defineComponentMetaLoader } from '#docs/sdk/component-meta'

const sources = [
  'packages/react/src/primitives/segmented-control/SegmentedControlRoot.tsx',
  'packages/react/src/primitives/segmented-control/SegmentedControlItem.tsx'
]

export default defineComponentMetaLoader(sources)
