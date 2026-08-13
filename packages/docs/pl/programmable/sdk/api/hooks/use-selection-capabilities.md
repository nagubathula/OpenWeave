---
title: useSelectionCapabilities
description: Wyprowadzaj wartości logiczne przyjazne poleceniom dla UI i akcji napędzanych selekcją.
---

# useSelectionCapabilities

`useSelectionCapabilities()` udostępnia reaktywne wartości logiczne wskazujące, czy typowe akcje edytora są aktualnie dozwolone.

Użyj go przy budowaniu:

- menu
- pasków narzędzi
- skrótów klawiaturowych
- przycisków akcji
- kontekstowych paneli

## Użycie

```ts
import { useSelectionCapabilities } from '@openweave/react'

const caps = useSelectionCapabilities()
```

## Podstawowy przykład

```tsx
import { useSelectionCapabilities } from '@openweave/react'

export function SelectionActions() {
  const { canDelete, canDuplicate, canCreateComponent } = useSelectionCapabilities()

  return (
    <div className="flex gap-2">
      <button disabled={!canDuplicate}>Duplikuj</button>
      <button disabled={!canDelete}>Usuń</button>
      <button disabled={!canCreateComponent}>Utwórz komponent</button>
    </div>
  )
}
```

## Przykłady praktyczne

### Bramkuj wpisy menu

```ts
const { canMoveToPage, canGoToMainComponent } = useSelectionCapabilities()
```

### Włącz polecenia powiększenia tylko gdy przydatne

```ts
const { canZoomToSelection } = useSelectionCapabilities()
```

## Powiązane API

- [useSelectionState](./use-selection-state)
- [useEditorCommands](./use-editor-commands)
