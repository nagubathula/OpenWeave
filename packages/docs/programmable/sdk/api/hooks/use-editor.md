---
title: useEditor
description: Access the current injected OpenWeave editor instance.
---

# useEditor

`useEditor()` returns the current injected OpenWeave editor.

It is the main entry point for SDK composables and headless primitives that need editor access.

## Usage

`useEditor()` must be called inside a subtree where `provideEditor(editor)` has already been called.

```ts
import { useEditor } from '@openweave/react'

const editor = useEditor()
```

## Basic example

```tsx
import { useEditor } from '@openweave/react'

export function CurrentPage() {
  const editor = useEditor()
  const pageId = editor.state.currentPageId

  return <div>Current page: {pageId}</div>
}
```

## Practical examples

### Read selected nodes

```ts
const editor = useEditor()
const selected = editor.getSelectedNodes()
```

### Trigger commands

```ts
const editor = useEditor()
editor.zoomToFit()
editor.undoAction()
```

## Error behavior

If called outside an editor provider tree, `useEditor()` throws with a helpful message.

That is intentional — this API should fail loudly when the editor context is missing.

## Related APIs

- [provideEditor](./provide-editor)
- [useCanvas](./use-canvas)
- [useSelectionState](./use-selection-state)
- [useEditorCommands](./use-editor-commands)

## Type

```ts
function useEditor(): Editor
```
