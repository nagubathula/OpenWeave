---
title: useSelectionState
description: Stato reattivo dell'editor derivato dalla selezione corrente, conteggio e tipo di selezione.
---

# useSelectionState

`useSelectionState()` espone lo stato reattivo derivato dalla selezione nell'editor corrente.

Usalo quando hai bisogno di renderizzare UI basata su:

- se qualcosa è selezionato
- quanti nodi sono selezionati
- il nodo selezionato primario
- se la selezione corrente è un'istanza, un componente o un gruppo

## Utilizzo

```ts
import { useSelectionState } from '@openweave/react'

const selection = useSelectionState()
```

## Esempio base

```tsx
import { useSelectionState } from '@openweave/react'

export function SelectionSummary() {
  const { hasSelection, selectedCount, isInstance } = useSelectionState()

  if (!hasSelection) return <div className="text-xs text-muted">Nessuna selezione</div>

  return (
    <div className="text-xs text-muted">
      {selectedCount} selezionati
      {isInstance && <span> · istanza</span>}
    </div>
  )
}
```

## Cosa restituisce

I valori utili includono:

- `selectedIds`
- `hasSelection`
- `selectedNode`
- `selectedCount`
- `selectedNodeType`
- `isInstance`
- `isComponent`
- `isGroup`
- `canCreateComponentSet`

## Esempi pratici

### Mostra azioni solo per le istanze

```ts
const { isInstance } = useSelectionState()
```

### Abilita la UI per la creazione di set di componenti

```ts
const { canCreateComponentSet } = useSelectionState()
```

## API correlate

- [useSelectionCapabilities](./use-selection-capabilities)
- [useEditorCommands](./use-editor-commands)
- [useEditor](./use-editor)
