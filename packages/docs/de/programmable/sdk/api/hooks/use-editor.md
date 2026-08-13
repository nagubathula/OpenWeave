---
title: useEditor
description: Auf die aktuell injizierte OpenWeave-Editor-Instanz zugreifen.
---

# useEditor

`useEditor()` gibt den aktuell injizierten OpenWeave-Editor zurück.

Es ist der Haupt-Einstiegspunkt für SDK-Composables und headless Primitive, die Editor-Zugriff benötigen.

## Verwendung

`useEditor()` muss innerhalb eines Teilbaums aufgerufen werden, in dem `provideEditor(editor)` bereits aufgerufen wurde.

```ts
import { useEditor } from '@openweave/react'

const editor = useEditor()
```

## Einfaches Beispiel

```tsx
import { useEditor } from '@openweave/react'

export function CurrentPage() {
  const editor = useEditor()
  const pageId = editor.state.currentPageId

  return <div>Aktuelle Seite: {pageId}</div>
}
```

## Praktische Beispiele

### Ausgewählte Knoten lesen

```ts
const editor = useEditor()
const selected = editor.getSelectedNodes()
```

### Befehle auslösen

```ts
const editor = useEditor()
editor.zoomToFit()
editor.undoAction()
```

## Fehlerverhalten

Wenn außerhalb eines Editor-Provider-Baums aufgerufen, wirft `useEditor()` eine hilfreiche Fehlermeldung.

Das ist beabsichtigt — diese API sollte laut fehlschlagen, wenn der Editor-Kontext fehlt.

## Verwandte APIs

- [provideEditor](./provide-editor)
- [useCanvas](./use-canvas)
- [useSelectionState](./use-selection-state)
- [useEditorCommands](./use-editor-commands)

## Typ

```ts
function useEditor(): Editor
```
