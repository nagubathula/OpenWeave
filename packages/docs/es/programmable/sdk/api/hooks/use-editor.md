---
title: useEditor
description: Accede a la instancia del editor de OpenWeave actualmente inyectada.
---

# useEditor

`useEditor()` devuelve el editor de OpenWeave actualmente inyectado.

Es el punto de entrada principal para los composables del SDK y los primitivos headless que necesitan acceso al editor.

## Uso

`useEditor()` debe llamarse dentro de un subárbol donde `provideEditor(editor)` ya haya sido llamado.

```ts
import { useEditor } from '@openweave/react'

const editor = useEditor()
```

## Ejemplo básico

```tsx
import { useEditor } from '@openweave/react'

export function CurrentPage() {
  const editor = useEditor()
  const pageId = editor.state.currentPageId

  return <div>Página actual: {pageId}</div>
}
```

## Ejemplos prácticos

### Leer los nodos seleccionados

```ts
const editor = useEditor()
const selected = editor.getSelectedNodes()
```

### Ejecutar comandos

```ts
const editor = useEditor()
editor.zoomToFit()
editor.undoAction()
```

## Comportamiento de error

Si se llama fuera de un árbol con proveedor de editor, `useEditor()` lanza un error con un mensaje descriptivo.

Esto es intencional — esta API debe fallar de forma ruidosa cuando falta el contexto del editor.

## APIs relacionadas

- [provideEditor](./provide-editor)
- [useCanvas](./use-canvas)
- [useSelectionState](./use-selection-state)
- [useEditorCommands](./use-editor-commands)

## Tipo

```ts
function useEditor(): Editor
```
