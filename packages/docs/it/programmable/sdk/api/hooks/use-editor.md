---
title: useEditor
description: Accede all'istanza corrente dell'editor OpenWeave iniettata.
---

# useEditor

`useEditor()` restituisce l'editor OpenWeave iniettato corrente.

È il punto di ingresso principale per i composable SDK e le primitive headless che necessitano di accesso all'editor.

## Utilizzo

`useEditor()` deve essere chiamato all'interno di un sottoalbero dove `provideEditor(editor)` è già stato chiamato.

```ts
import { useEditor } from '@openweave/react'

const editor = useEditor()
```

## Esempio base

```tsx
import { useEditor } from '@openweave/react'

export function CurrentPage() {
  const editor = useEditor()
  const pageId = editor.state.currentPageId

  return <div>Current page: {pageId}</div>
}
```

## Esempi pratici

### Leggi i nodi selezionati

```ts
const editor = useEditor()
const selected = editor.getSelectedNodes()
```

### Esegui comandi

```ts
const editor = useEditor()
editor.zoomToFit()
editor.undoAction()
```

## Comportamento in caso di errore

Se chiamato al di fuori di un albero con il provider dell'editor, `useEditor()` lancia un'eccezione con un messaggio utile.

Questo è intenzionale — questa API deve fallire in modo evidente quando manca il contesto dell'editor.

## API correlate

- [provideEditor](./provide-editor)
- [useCanvas](./use-canvas)
- [useSelectionState](./use-selection-state)
- [useEditorCommands](./use-editor-commands)

## Tipo

```ts
function useEditor(): Editor
```
