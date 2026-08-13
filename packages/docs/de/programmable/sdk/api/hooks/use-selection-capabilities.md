---
title: useSelectionCapabilities
description: Befehlsfreundliche Booleans für auswahlgesteuerte UI und Aktionen ableiten.
---

# useSelectionCapabilities

`useSelectionCapabilities()` gibt reaktive Booleans zurück, ob gängige Editor-Aktionen aktuell erlaubt sind.

Verwenden Sie es beim Erstellen von:

- Menüs
- Toolbars
- Tastaturkürzeln
- Aktionsschaltflächen
- kontextuellen Panels

## Verwendung

```ts
import { useSelectionCapabilities } from '@openweave/react'

const caps = useSelectionCapabilities()
```

## Einfaches Beispiel

```tsx
import { useSelectionCapabilities } from '@openweave/react'

export function SelectionActions() {
  const { canDelete, canDuplicate, canCreateComponent } = useSelectionCapabilities()

  return (
    <div className="flex gap-2">
      <button disabled={!canDuplicate}>Duplizieren</button>
      <button disabled={!canDelete}>Löschen</button>
      <button disabled={!canCreateComponent}>Als Komponente</button>
    </div>
  )
}
```

## Praktische Beispiele

### Menüeinträge sperren

```ts
const { canMoveToPage, canGoToMainComponent } = useSelectionCapabilities()
```

### Zoom-Befehle nur aktivieren, wenn sinnvoll

```ts
const { canZoomToSelection } = useSelectionCapabilities()
```

## Verwandte APIs

- [useSelectionState](./use-selection-state)
- [useEditorCommands](./use-editor-commands)
