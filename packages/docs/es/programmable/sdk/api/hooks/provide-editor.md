---
title: provideEditor
description: Proporciona una instancia del editor de OpenWeave a un subárbol de Vue mediante inyección.
---

# provideEditor

`provideEditor(editor)` pone un editor de OpenWeave a disposición de los composables descendientes y los primitivos headless a través de la inyección de Vue.

Esta es la base para `useEditor()`.

## Uso

```ts
import { provideEditor } from '@openweave/react'

provideEditor(editor)
```

## Ejemplo básico

```tsx
import type { ReactNode } from 'react'
import { EditorProvider } from '@openweave/react'

import type { Editor } from '@openweave/core/editor'

export function EditorHost({ editor, children }: { editor: Editor; children: ReactNode }) {
  return <EditorProvider editor={editor}>{children}</EditorProvider>
}
```

## Notas

El SDK actual usa `provideEditor()` y `useEditor()` directamente. Algunos ejemplos y mensajes de error más antiguos aún hacen referencia a un componente `OpenWeaveProvider`, pero el modelo de inyección es la superficie de API real que hay que preferir en la documentación y el código de la app.

## APIs relacionadas

- [useEditor](./use-editor)
