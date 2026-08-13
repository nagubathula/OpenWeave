---
title: provideEditor
description: Dostarcz instancję edytora OpenWeave do poddrzewa Vue przez wstrzykiwanie.
---

# provideEditor

`provideEditor(editor)` udostępnia edytor OpenWeave potomnym kompozytom i bezstanowym prymitywom przez wstrzykiwanie Vue.

To fundament dla `useEditor()`.

## Użycie

```ts
import { provideEditor } from '@openweave/react'

provideEditor(editor)
```

## Podstawowy przykład

```tsx
import type { ReactNode } from 'react'
import { EditorProvider } from '@openweave/react'

import type { Editor } from '@openweave/core/editor'

export function EditorHost({ editor, children }: { editor: Editor; children: ReactNode }) {
  return <EditorProvider editor={editor}>{children}</EditorProvider>
}
```

## Uwagi

Obecny SDK używa bezpośrednio `provideEditor()` i `useEditor()`. Niektóre starsze przykłady i komunikaty błędów nadal odwołują się do komponentu `OpenWeaveProvider`, ale model wstrzykiwania jest rzeczywistą powierzchnią API preferowaną w dokumentacji i kodzie aplikacji.

## Powiązane API

- [useEditor](./use-editor)
