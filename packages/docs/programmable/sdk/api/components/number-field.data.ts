import { defineComponentMetaLoader } from '#docs/sdk/component-meta'

const sources = [
  'packages/react/src/primitives/number-field/NumberFieldRoot.tsx',
  'packages/react/src/primitives/number-field/NumberFieldInput.tsx',
  'packages/react/src/primitives/number-field/NumberFieldValue.tsx'
]

export default defineComponentMetaLoader(sources)
