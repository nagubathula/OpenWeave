---
title: provideEditor
description: Fornisce un'istanza dell'editor OpenWeave a un sottoalbero Vue tramite iniezione.
---

# provideEditor

`provideEditor(editor)` rende un editor OpenWeave disponibile ai composable e alle primitive headless discendenti tramite l'iniezione Vue.

È il fondamento di `useEditor()`.

## Utilizzo

```ts
import { provideEditor } from '@openweave/react'

provideEditor(editor)
```

## Esempio base

```tsx
import type { ReactNode } from 'react'
import { EditorProvider } from '@openweave/react'

import type { Editor } from '@openweave/core/editor'

export function EditorHost({ editor, children }: { editor: Editor; children: ReactNode }) {
  return <EditorProvider editor={editor}>{children}</EditorProvider>
}
```

## Note

L'SDK attuale usa `provideEditor()` e `useEditor()` direttamente. Alcuni esempi e messaggi di errore più vecchi fanno ancora riferimento a un componente `OpenWeaveProvider`, ma il modello di iniezione è la vera superficie API da preferire nella documentazione e nel codice dell'app.

## API correlate

- [useEditor](./use-editor)
