---
title: useSelectionState
description: Reactive selection-derived editor state for current node, count, and selection type.
---

# useSelectionState

`useSelectionState()` exposes reactive selection-derived state from the current editor.

Use it when you need to render UI based on:

- whether anything is selected
- how many nodes are selected
- the primary selected node
- whether the current selection is an instance, component, or group

## Usage

```ts
import { useSelectionState } from '@openweave/react'

const selection = useSelectionState()
```

## Basic example

```tsx
import { useSelectionState } from '@openweave/react'

export function SelectionSummary() {
  const { hasSelection, selectedCount, isInstance } = useSelectionState()

  if (!hasSelection) return <div className="text-xs text-muted">No selection</div>

  return (
    <div className="text-xs text-muted">
      {selectedCount} selected
      {isInstance && <span> · instance</span>}
    </div>
  )
}
```

## What it returns

Useful values include:

- `selectedIds`
- `hasSelection`
- `selectedNode`
- `selectedCount`
- `selectedNodeType`
- `isInstance`
- `isComponent`
- `isGroup`
- `canCreateComponentSet`

## Practical examples

### Show instance-only actions

```ts
const { isInstance } = useSelectionState()
```

### Enable component-set creation UI

```ts
const { canCreateComponentSet } = useSelectionState()
```

## Related APIs

- [useSelectionCapabilities](./use-selection-capabilities)
- [useEditorCommands](./use-editor-commands)
- [useEditor](./use-editor)
