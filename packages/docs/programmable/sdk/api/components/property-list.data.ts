import { defineComponentMetaLoader } from '#docs/sdk/component-meta'

const sources = [
  'packages/react/src/primitives/property-list/PropertyListRoot.tsx',
  'packages/react/src/primitives/property-list/PropertyListItem.tsx',
  'packages/react/src/primitives/property-list/PropertyListAdd.tsx',
  'packages/react/src/primitives/property-list/PropertyListRemove.tsx',
  'packages/react/src/primitives/property-list/PropertyListVisibility.tsx'
]

export default defineComponentMetaLoader(sources)
