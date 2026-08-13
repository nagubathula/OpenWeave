import { defineComponentMetaLoader } from '#docs/sdk/component-meta'

const sources = [
  'packages/react/src/primitives/property-section/PropertySectionRoot.tsx',
  'packages/react/src/primitives/property-section/PropertySectionHeader.tsx',
  'packages/react/src/primitives/property-section/PropertySectionTitle.tsx',
  'packages/react/src/primitives/property-section/PropertySectionActions.tsx',
  'packages/react/src/primitives/property-section/PropertySectionContent.tsx',
  'packages/react/src/primitives/property-section/PropertySectionEmptyAction.tsx'
]

export default defineComponentMetaLoader(sources)
