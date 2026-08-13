---
title: useSelectionCapabilities
description: Derive command-friendly booleans for selection-driven UI and actions.
---

# useSelectionCapabilities

`useSelectionCapabilities()` exposes reactive booleans for whether common editor actions are currently allowed.

Use it when building:

- menus
- toolbars
- keyboard shortcuts
- action buttons
- contextual panels

## Usage

```ts
import { useSelectionCapabilities } from '@openweave/react'

const caps = useSelectionCapabilities()
```

## Basic example

```tsx
import { useSelectionCapabilities } from '@openweave/react'

export function SelectionActions() {
  const { canDelete, canDuplicate, canCreateComponent } = useSelectionCapabilities()

  return (
    <div className="flex gap-2">
      <button disabled={!canDuplicate}>Duplicate</button>
      <button disabled={!canDelete}>Delete</button>
      <button disabled={!canCreateComponent}>Make component</button>
    </div>
  )
}
```

## Practical examples

### Gate menu entries

```ts
const { canMoveToPage, canGoToMainComponent } = useSelectionCapabilities()
```

### Enable zoom commands only when useful

```ts
const { canZoomToSelection } = useSelectionCapabilities()
```

## Related APIs

- [useSelectionState](./use-selection-state)
- [useEditorCommands](./use-editor-commands)
