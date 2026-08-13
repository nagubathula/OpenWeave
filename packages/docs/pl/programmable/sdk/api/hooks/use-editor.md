---
title: useEditor
description: Uzyskaj dostęp do bieżącej wstrzykniętej instancji edytora OpenWeave.
---

# useEditor

`useEditor()` zwraca bieżący wstrzyknięty edytor OpenWeave.

Jest to główny punkt wejścia dla kompozytów SDK i bezstanowych prymitywów, które potrzebują dostępu do edytora.

## Użycie

`useEditor()` musi być wywołane wewnątrz poddrzewa, gdzie wcześniej wywołano `provideEditor(editor)`.

```ts
import { useEditor } from '@openweave/react'

const editor = useEditor()
```

## Podstawowy przykład

```tsx
import { useEditor } from '@openweave/react'

export function CurrentPage() {
  const editor = useEditor()
  const pageId = editor.state.currentPageId

  return <div>Bieżąca strona: {pageId}</div>
}
```

## Przykłady praktyczne

### Odczytaj zaznaczone węzły

```ts
const editor = useEditor()
const selected = editor.getSelectedNodes()
```

### Wyzwól polecenia

```ts
const editor = useEditor()
editor.zoomToFit()
editor.undoAction()
```

## Zachowanie przy błędzie

Jeśli wywołane poza drzewem dostawcy edytora, `useEditor()` rzuca z pomocnym komunikatem.

Jest to celowe — to API powinno głośno zawodzić, gdy brakuje kontekstu edytora.

## Powiązane API

- [provideEditor](./provide-editor)
- [useCanvas](./use-canvas)
- [useSelectionState](./use-selection-state)
- [useEditorCommands](./use-editor-commands)

## Typ

```ts
function useEditor(): Editor
```
