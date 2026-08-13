---
title: useSelectionState
description: Reaktiver auswahlabgeleiteter Editor-Zustand für aktuellen Knoten, Anzahl und Auswahltyp.
---

# useSelectionState

`useSelectionState()` gibt reaktiven auswahlabgeleiteten Zustand aus dem aktuellen Editor zurück.

Verwenden Sie es, wenn Sie UI basierend auf folgendem rendern müssen:

- ob etwas ausgewählt ist
- wie viele Knoten ausgewählt sind
- dem primär ausgewählten Knoten
- ob die aktuelle Auswahl eine Instanz, Komponente oder Gruppe ist

## Verwendung

```ts
import { useSelectionState } from '@openweave/react'

const selection = useSelectionState()
```

## Einfaches Beispiel

```tsx
import { useSelectionState } from '@openweave/react'

export function SelectionSummary() {
  const { hasSelection, selectedCount, isInstance } = useSelectionState()

  if (!hasSelection) return <div className="text-xs text-muted">Keine Auswahl</div>

  return (
    <div className="text-xs text-muted">
      {selectedCount} ausgewählt
      {isInstance && <span> · Instanz</span>}
    </div>
  )
}
```

## Rückgabewerte

Nützliche Werte umfassen:

- `selectedIds`
- `hasSelection`
- `selectedNode`
- `selectedCount`
- `selectedNodeType`
- `isInstance`
- `isComponent`
- `isGroup`
- `canCreateComponentSet`

## Praktische Beispiele

### Nur für Instanzen verfügbare Aktionen anzeigen

```ts
const { isInstance } = useSelectionState()
```

### UI zur Komponentenset-Erstellung aktivieren

```ts
const { canCreateComponentSet } = useSelectionState()
```

## Verwandte APIs

- [useSelectionCapabilities](./use-selection-capabilities)
- [useEditorCommands](./use-editor-commands)
- [useEditor](./use-editor)
