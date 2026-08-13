---
title: provideEditor
description: Provide an OpenWeave editor instance to a Vue subtree using injection.
---

# provideEditor

`provideEditor(editor)` makes an OpenWeave editor available to descendant composables and headless primitives through Vue injection.

This is the foundation for `useEditor()`.

## Usage

```ts
import { provideEditor } from '@openweave/react'

provideEditor(editor)
```

## Basic example

```tsx
import type { ReactNode } from 'react'
import { EditorProvider } from '@openweave/react'

import type { Editor } from '@openweave/core/editor'

export function EditorHost({ editor, children }: { editor: Editor; children: ReactNode }) {
  return <EditorProvider editor={editor}>{children}</EditorProvider>
}
```

## Notes

The current SDK uses `provideEditor()` and `useEditor()` directly. Some older examples and error messages still refer to an `OpenWeaveProvider` component, but the injection model is the real API surface to prefer in docs and app code.

## Related APIs

- [useEditor](./use-editor)
