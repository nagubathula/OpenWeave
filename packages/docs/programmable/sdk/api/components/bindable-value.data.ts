import { defineComponentMetaLoader } from '#docs/sdk/component-meta'

const sources = [
  'packages/react/src/primitives/bindable-value/BindableValueRoot.tsx',
  'packages/react/src/primitives/bindable-value/BindableValueTrigger.tsx',
  'packages/react/src/primitives/bindable-value/BindableValuePicker.tsx'
]

export default defineComponentMetaLoader(sources)
