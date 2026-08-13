---
title: useSelectionCapabilities
description: Ricava booleani orientati ai comandi per UI e azioni guidate dalla selezione.
---

# useSelectionCapabilities

`useSelectionCapabilities()` espone booleani reattivi che indicano se le azioni comuni dell'editor sono attualmente consentite.

Usalo quando costruisci:

- menu
- toolbar
- scorciatoie da tastiera
- pulsanti di azione
- pannelli contestuali

## Utilizzo

```ts
import { useSelectionCapabilities } from '@openweave/react'

const caps = useSelectionCapabilities()
```

## Esempio base

```tsx
import { useSelectionCapabilities } from '@openweave/react'

export function SelectionActions() {
  const { canDelete, canDuplicate, canCreateComponent } = useSelectionCapabilities()

  return (
    <div className="flex gap-2">
      <button disabled={!canDuplicate}>Duplica</button>
      <button disabled={!canDelete}>Elimina</button>
      <button disabled={!canCreateComponent}>Crea componente</button>
    </div>
  )
}
```

## Esempi pratici

### Condiziona le voci di menu

```ts
const { canMoveToPage, canGoToMainComponent } = useSelectionCapabilities()
```

### Abilita i comandi di zoom solo quando utile

```ts
const { canZoomToSelection } = useSelectionCapabilities()
```

## API correlate

- [useSelectionState](./use-selection-state)
- [useEditorCommands](./use-editor-commands)
